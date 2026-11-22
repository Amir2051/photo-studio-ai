import React from 'react';

export interface AIDockProps {
  /** Opens the existing, read-only MIA Control Center workspace. */
  onOpenMia: () => void;
}

/**
 * Compact, always-visible diagnostics dock.
 *
 * STRICTLY NON-LIVE: this component renders static local status text and only
 * navigates to the existing MIA Control Center. It never calls a provider,
 * never sends prompts or media, and never changes ZDR, consent, grants,
 * budget or routing state.
 */
export default function AIDock({ onOpenMia }: AIDockProps): React.JSX.Element {
  return (
    <aside className="studio-ai-dock" data-testid="ai-dock" aria-label="AI dock (non-live)">
      <div className="studio-ai-dock-head">
        <span className="studio-ai-dock-badge" data-testid="ai-dock-local">
          LOCAL
        </span>
        <span className="studio-ai-dock-title">AI DOCK</span>
        <span className="studio-ai-dock-state" data-testid="ai-dock-state">
          NON-LIVE · APPROVAL REQUIRED
        </span>
      </div>
      <p className="studio-ai-dock-text" data-testid="ai-dock-status">
        Live execution disabled. No prompts or media are sent to any provider. ZDR, consent,
        grants, budget and routing are unchanged here.
      </p>
      <button type="button" className="studio-ai-dock-link" onClick={onOpenMia}>
        Open MIA Control Center →
      </button>
    </aside>
  );
}
