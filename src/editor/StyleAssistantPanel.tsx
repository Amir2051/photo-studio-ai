import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { type StyleInterpretation } from '../lib/styleAssistant';

export interface StyleAssistantPanelProps {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  hasImage: boolean;
  suggestFromPrompt: () => void;
  styleInterpretation: StyleInterpretation | null;
  styleRecipeName: string;
  batchBusy: boolean;
  saveCurrentStyle: (nameOverride?: string) => Promise<void>;
}

export default function StyleAssistantPanel({
  prompt,
  setPrompt,
  hasImage,
  suggestFromPrompt,
  styleInterpretation,
  styleRecipeName,
  batchBusy,
  saveCurrentStyle,
}: StyleAssistantPanelProps): React.JSX.Element {
  return (
              <section className="tool-panel assistant-panel" data-panel="adjust">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">LOCAL EDITING HELPER</p>
                    <h2>Describe the look</h2>
                  </div>
                  <span className="offline-tag">OFFLINE</span>
                </div>
                <p>
                  Describe the look in plain language. The on-device assistant converts recognized
                  directions into editable color settings, filter choices, and optional face-aware
                  smoothing. Nothing is sent to a cloud model.
                </p>
                <div className="prompt-row">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && hasImage && suggestFromPrompt()}
                    placeholder="e.g. warm luxury fashion campaign, soft skin"
                    disabled={!hasImage}
                  />
                  <button
                    onClick={suggestFromPrompt}
                    disabled={!hasImage || !prompt.trim()}
                    aria-label="Interpret style instruction"
                  >
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </div>
                {styleInterpretation && (
                  <div className="style-assistant-result">
                    <strong>Proposed editing recipe</strong>
                    <ul>
                      {styleInterpretation.explanation.map((line, index) => (
                        <li key={`${index}-${line}`}>{line}</li>
                      ))}
                    </ul>
                    <div className="style-assistant-values">
                      <span>Brightness {Math.round(styleInterpretation.settings.brightness)}%</span>
                      <span>Contrast {Math.round(styleInterpretation.settings.contrast)}%</span>
                      <span>Saturation {Math.round(styleInterpretation.settings.saturation)}%</span>
                      <span>Warmth {Math.round(styleInterpretation.settings.warmth)}</span>
                    </div>
                    <button
                      className="button button-primary style-save-button"
                      onClick={() => {
                        void saveCurrentStyle(styleRecipeName.trim() || 'AI Style Recipe');
                      }}
                      disabled={!hasImage || batchBusy}
                    >
                      Save proposed look as Style Recipe
                    </button>
                  </div>
                )}
                <p className="tool-note">
                  This is a local rule-based assistant, not a connected generative AI model.
                  Advanced effects and cloud language-model interpretation are not enabled.
                </p>
              </section>
  );
}
