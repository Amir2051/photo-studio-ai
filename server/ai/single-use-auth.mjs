// Narrow, in-memory, single-use authorization for the one authorized local
// OpenRouter test. No env vars, files, storage, logs or CLI arguments hold
// authorization material. Persistent live gate stays false; this is a one-time
// auditable exception consumed at the final provider boundary.

import { randomUUID, createHash } from 'node:crypto';
import { readSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { estimateRequestCost, PricingUnavailableError, TEST_MODEL as PRICING_MODEL } from './pricing.mjs';

export const APPROVAL_PHRASE = 'AUTHORIZE MINI STUDIO OPENROUTER TEST';
export const TEST_PURPOSE = 'M2B_OPENROUTER_CONTROLLED_TEST';
export const TEST_PROVIDER = 'openrouter';
export const TEST_MODEL = PRICING_MODEL;
export const TEST_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
export const TEST_MAX_TOKENS = 32;
export const TEST_MAX_COST_USD = 0.001;
export const TEST_MESSAGES = Object.freeze([
  Object.freeze({ role: 'user', content: 'Reply with exactly: MINISTUDIO_OPENROUTER_TEST_OK' }),
]);
export const TEST_POLICY = Object.freeze({
  zdr: true,
  dataCollection: 'deny',
  allowFallbacks: false,
  requireParameters: true,
});

const MAX_EXPIRY_MS = 5 * 60 * 1000;
const APPROVAL = Symbol('approval');
const HANDLE = Symbol('m2b-single-use-grant');
const approvals = new WeakSet();
const issued = new WeakSet();
const states = new WeakMap();
// F-04: grants are isolated by operation, not a single overwritable global.
const activeGrants = new Map();

export class TestAuthorizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TestAuthorizationError';
    this.code = code;
  }
}

const monotonicNow = () => performance.now();
const fp = (value) => JSON.stringify(value);

function defaultInput(prompt) {
  process.stdout.write(prompt + '\n');
  const buffer = Buffer.alloc(512);
  const bytes = readSync(0, buffer, 0, buffer.length, null);
  return buffer.toString('utf8', 0, bytes).trim();
}

// F-01: explicit operator approval. The default path blocks on local stdin;
// callers cannot silently obtain a grant by merely importing this module.
export function collectOperatorApproval({ input = defaultInput } = {}) {
  const phrase = input(`Type ${APPROVAL_PHRASE} to approve one local OpenRouter test:`);
  if (phrase !== APPROVAL_PHRASE) {
    throw new TestAuthorizationError('approval_denied', 'Operator approval was not given.');
  }
  const approval = Object.freeze({
    [APPROVAL]: true,
    id: randomUUID(),
    phraseHash: createHash('sha256').update(APPROVAL_PHRASE).digest('hex'),
    at: monotonicNow(),
  });
  approvals.add(approval);
  return approval;
}

export function issueTestGrant({ approval, operationId = TEST_PURPOSE, ttlMs = MAX_EXPIRY_MS } = {}) {
  if (!approvals.has(approval)) {
    throw new TestAuthorizationError('approval_required', 'Explicit operator approval is required.');
  }
  if (activeGrants.has(operationId)) {
    throw new TestAuthorizationError('authorization_active', 'An authorization already exists for this operation.');
  }
  const ttl = Number.isFinite(ttlMs) ? Math.min(MAX_EXPIRY_MS, Math.max(1, ttlMs)) : MAX_EXPIRY_MS;
  const estimate = estimateRequestCost({ messages: TEST_MESSAGES, maxTokens: TEST_MAX_TOKENS, modelId: TEST_MODEL });
  if (estimate.estimatedUsd > TEST_MAX_COST_USD) {
    throw new TestAuthorizationError('cost_ceiling_exceeded', 'The estimated cost exceeds the authorized ceiling.');
  }
  const handle = Object.freeze({ [HANDLE]: true, id: randomUUID() });
  issued.add(handle);
  states.set(handle, {
    id: handle.id,
    approvalId: approval.id,
    operationId,
    purpose: TEST_PURPOSE,
    provider: TEST_PROVIDER,
    model: TEST_MODEL,
    endpoint: TEST_ENDPOINT,
    maxTokens: TEST_MAX_TOKENS,
    maxEstimatedCostUsd: TEST_MAX_COST_USD,
    estimate,
    messagesFingerprint: fp(TEST_MESSAGES),
    policyFingerprint: fp(TEST_POLICY),
    processId: process.pid,
    issuedAt: monotonicNow(),
    expiresAt: monotonicNow() + ttl,
    consumed: false,
  });
  activeGrants.set(operationId, handle);
  return handle;
}

export function isGrantCandidate(handle) {
  if (!issued.has(handle)) return false;
  const state = states.get(handle);
  return !!state && activeGrants.get(state.operationId) === handle && !state.consumed;
}

// Synchronous check-and-consume: no await between validation and consumption.
export function consumeTestGrant(handle, descriptor) {
  if (!issued.has(handle)) throw new TestAuthorizationError('authorization_missing', 'No valid test authorization.');
  const state = states.get(handle);
  if (!state || activeGrants.get(state.operationId) !== handle) {
    throw new TestAuthorizationError('authorization_missing', 'No active test authorization for this operation.');
  }
  if (state.consumed) throw new TestAuthorizationError('authorization_consumed', 'Authorization already consumed.');
  if (monotonicNow() >= state.expiresAt) {
    activeGrants.delete(state.operationId);
    throw new TestAuthorizationError('authorization_expired', 'Authorization expired.');
  }
  if (descriptor.operationId !== state.operationId) {
    throw new TestAuthorizationError('operation_mismatch', 'Authorization is bound to a different operation.');
  }
  const checks = [
    [descriptor.processId === state.processId && descriptor.source === 'local-process', 'origin_mismatch', 'Restricted to the issuing local process.'],
    [descriptor.purpose === state.purpose && descriptor.purpose === TEST_PURPOSE, 'purpose_mismatch', 'Wrong purpose.'],
    [descriptor.provider === state.provider && descriptor.model === state.model && descriptor.endpoint === state.endpoint, 'target_mismatch', 'Wrong provider, model or endpoint.'],
    [descriptor.maxTokens === state.maxTokens, 'token_limit_mismatch', 'Only 32 output tokens are authorized.'],
    [descriptor.messagesFingerprint === state.messagesFingerprint, 'prompt_mismatch', 'Only the exact test prompt is authorized.'],
    [descriptor.policyFingerprint === state.policyFingerprint, 'policy_mismatch', 'Strict ZDR policy is required.'],
    [descriptor.toolsPresent === false && descriptor.attachmentCount === 0 && descriptor.retry === false && descriptor.fallback === false, 'request_shape_mismatch', 'No tools, attachments, retries or fallback.'],
  ];
  for (const [ok, code, message] of checks) {
    if (!ok) throw new TestAuthorizationError(code, message);
  }
  // F-02: recompute cost from the exact request with verified pricing.
  let estimate;
  try {
    estimate = estimateRequestCost({ messages: descriptor.messages, maxTokens: descriptor.maxTokens, modelId: descriptor.model });
  } catch (error) {
    if (error instanceof PricingUnavailableError) throw new TestAuthorizationError('pricing_unavailable', error.message);
    throw error;
  }
  if (estimate.estimatedUsd > state.maxEstimatedCostUsd || estimate.estimatedUsd <= 0) {
    throw new TestAuthorizationError('cost_ceiling_exceeded', 'Estimated cost exceeds the authorized ceiling.');
  }
  state.consumed = true;
  activeGrants.delete(state.operationId);
  return {
    ok: true,
    authorizationId: state.id,
    approvalId: state.approvalId,
    estimatedCostUsd: estimate.estimatedUsd,
  };
}

export function revokeTestGrant(operationId = TEST_PURPOSE) {
  activeGrants.delete(operationId);
}
