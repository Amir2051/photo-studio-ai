import React, { useMemo, useState } from 'react';
import { listModels, type RegistryModel } from '../../server/ai/model-registry.mjs';
import { TASKS, routeTask, type RoutingDecision } from '../../server/ai/router.mjs';
import { MISTRAL_PILOT_CEILING_USD, createBudget, remainingUsd } from '../../server/ai/budget.mjs';
import './MiaControlCenter.css';

type MiaStatus = 'adapter-ready' | 'planned' | 'disabled' | 'unknown';

function statusOf(model: RegistryModel): MiaStatus {
  if (model.availability === 'planned' || !model.adapterAvailable) return 'planned';
  if (model.liveExecutionEnabled) return 'disabled'; // never enabled during M2B-3
  if (model.availability === 'adapter-ready') return 'adapter-ready';
  return 'unknown';
}

const statusLabel: Record<MiaStatus, string> = {
  'adapter-ready': 'Adapter ready · live disabled',
  planned: 'Planned · not usable',
  disabled: 'Live execution disabled',
  unknown: 'Status unknown',
};

export interface MiaControlCenterProps {
  onBack?: () => void;
}

export default function MiaControlCenter({ onBack }: MiaControlCenterProps): React.JSX.Element {
  const models = useMemo(() => listModels(), []);
  const budget = useMemo(() => createBudget(), []);
  const [task, setTask] = useState('chat');
  const [routed, setRouted] = useState(() => routeTask({ task: 'chat' }));
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const identities = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ identity: string; model: RegistryModel | null }> = [];
    for (const model of models) {
      if (!seen.has(model.miaIdentity)) {
        seen.add(model.miaIdentity);
        out.push({ identity: model.miaIdentity, model });
      }
    }
    return out;
  }, [models]);

  const decision: RoutingDecision | null = routed.ok ? routed.decision : null;
  const explanation = routed.explanation;

  function explainRouting() {
    setRouted(routeTask({ task }));
  }

  return (
    <main className="mia-page" data-testid="mia-control-center">
      <header className="mia-header">
        {onBack && (
          <button type="button" className="mia-back" onClick={onBack} aria-label="Back to studio">
            ← Back
          </button>
        )}
        <div>
          <h1>MIA Control Center</h1>
          <p>Model status, routing and safeguards for the Minu Studio AI assistant.</p>
        </div>
        <span className="mia-live-badge" data-testid="mia-live-state">NON-LIVE · M2B-3</span>
      </header>

      <section className="mia-card" aria-labelledby="mia-models-heading">
        <h2 id="mia-models-heading">MIA models</h2>
        <div className="mia-model-grid">
          {identities.map(({ identity, model }) => {
            const status = model ? statusOf(model) : 'unknown';
            return (
              <article className="mia-model" key={identity} data-testid="mia-model">
                <h3>{identity}</h3>
                <span className={`mia-status mia-status-${status}`}>{statusLabel[status]}</span>
                <p>
                  {status === 'planned'
                    ? 'This capability has not been configured and cannot run a task.'
                    : 'The adapter exists, but live execution is disabled in this milestone. No provider request can be sent.'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mia-card" aria-labelledby="mia-routing-heading">
        <h2 id="mia-routing-heading">Task-aware routing</h2>
        <div className="mia-row">
          <label htmlFor="mia-task">Requested task</label>
          <select id="mia-task" value={task} onChange={(e) => setTask(e.target.value)}>
            {Object.keys(TASKS).map((key) => (
              <option key={key} value={key}>{key.replaceAll('_', ' ')}</option>
            ))}
          </select>
          <button type="button" onClick={explainRouting}>Explain routing</button>
        </div>
        <p className="mia-explanation" role="status" data-testid="mia-explanation">{explanation}</p>
        {decision && (
          <p className="mia-decision" data-testid="mia-decision">
            Selected identity: {decision.miaIdentity} · Reason: {decision.reason} · No request was sent.
          </p>
        )}
        {!decision && (
          <p className="mia-decision" data-testid="mia-no-model">No model executed or substituted for this task.</p>
        )}
      </section>

      <section className="mia-card" aria-labelledby="mia-consent-heading">
        <h2 id="mia-consent-heading">Approval</h2>
        {decision?.requiresConsent ? (
          <>
            <p data-testid="mia-consent-required">
              Approval is required before {decision.miaIdentity} can process “{decision.task.replaceAll('_', ' ')}”.
              {' '}The estimated cost is unavailable, so no request was submitted.
            </p>
            <button type="button" disabled data-testid="mia-approve-button">
              Approve &amp; run (disabled — live execution off in M2B-3)
            </button>
            <p className="mia-note">Generic approval is never accepted for a different task or model.</p>
          </>
        ) : (
          <p data-testid="mia-consent-none">No paid request is pending. Nothing was approved or submitted.</p>
        )}
      </section>

      <section className="mia-card" aria-labelledby="mia-budget-heading">
        <h2 id="mia-budget-heading">Budget &amp; usage</h2>
        <dl className="mia-budget" data-testid="mia-budget">
          <dt>Authoritative pilot ceiling</dt>
          <dd>${MISTRAL_PILOT_CEILING_USD.toFixed(2)}</dd>
          <dt>Confirmed spend</dt>
          <dd>$0.00</dd>
          <dt>Unconfirmed / unknown cost</dt>
          <dd>Not counted as $0.00</dd>
          <dt>Remaining allowance</dt>
          <dd>${remainingUsd(budget).toFixed(2)}</dd>
        </dl>
        <p className="mia-note">Ledger data shown here is temporary in-memory state, not a durable audit history.</p>
      </section>

      <section className="mia-card" aria-labelledby="mia-diagnostics-heading">
        <h2 id="mia-diagnostics-heading">Administrative diagnostics</h2>
        <button
          type="button"
          onClick={() => setShowDiagnostics((v) => !v)}
          aria-expanded={showDiagnostics}
          data-testid="mia-diagnostics-toggle"
        >
          {showDiagnostics ? 'Hide' : 'Show'} technical detail
        </button>
        {showDiagnostics && (
          <dl className="mia-diagnostics" data-testid="mia-diagnostics">
            <dt>Actual provider</dt><dd>{decision?.providerId ?? 'none'}</dd>
            <dt>Actual provider model ID</dt><dd>{decision?.providerModelId ?? 'none'}</dd>
            <dt>Model version</dt><dd>{decision?.modelVersion ?? 'unknown'}</dd>
            <dt>Adapter readiness</dt><dd>{decision ? (models.find((m) => m.id === decision.modelId)?.adapterAvailable ? 'ready' : 'not ready') : 'n/a'}</dd>
            <dt>Live execution gate</dt><dd>{decision ? (decision.liveExecutionEnabled ? 'enabled' : 'disabled') : 'n/a'}</dd>
            <dt>Consent status</dt><dd>{decision?.requiresConsent ? 'required, not granted' : 'not required'}</dd>
            <dt>Budget decision</dt><dd>{decision?.costClass === 'paid' ? 'reservation required before execution; none made' : 'no paid reservation'}</dd>
            <dt>Ledger status</dt><dd>no attempt recorded by this screen</dd>
            <dt>Routing reason</dt><dd>{decision?.reason ?? 'no eligible model'}</dd>
          </dl>
        )}
        <p className="mia-note">No API keys, tokens or environment values are displayed.</p>
      </section>

      <footer className="mia-footer" data-testid="mia-footer">
        Live provider execution is disabled in M2B-3. This screen cannot call OpenRouter, Mistral, Gemini or any other provider.
      </footer>
    </main>
  );
}
