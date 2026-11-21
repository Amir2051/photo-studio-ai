// Test-only helper for isolated offline tests. Produces an explicit approval
// via injected stdin and an in-memory single-use grant for the exact test.
import {
  collectOperatorApproval, issueTestGrant, APPROVAL_PHRASE,
  TEST_PURPOSE, TEST_MESSAGES, TEST_MAX_TOKENS, TEST_MAX_COST_USD,
} from '../../server/ai/single-use-auth.mjs';

export function approvedGrant(overrides = {}) {
  const approval = collectOperatorApproval({ input: () => APPROVAL_PHRASE });
  return issueTestGrant({ approval, ...overrides });
}

export function localTestGrant() {
  return approvedGrant();
}

export function grantCallArgs() {
  return {
    testGrant: localTestGrant(),
    purpose: TEST_PURPOSE,
    operationId: TEST_PURPOSE,
    source: 'local-process',
    maxEstimatedCostUsd: TEST_MAX_COST_USD,
  };
}

export const authorizedMessages = TEST_MESSAGES;
export const authorizedMaxTokens = TEST_MAX_TOKENS;
