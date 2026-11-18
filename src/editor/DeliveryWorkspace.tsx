import React from 'react';
import { Save, Download } from 'lucide-react';
import type { ExportFormat } from '../lib/types';

export type DeliveryFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface DeliveryWorkspaceProps {
  exportFormat: DeliveryFormat;
  setExportFormat: React.Dispatch<React.SetStateAction<DeliveryFormat>>;
  saveToLibrary: () => void;
  exportPhoto: () => void;
  busy: boolean;
}

/**
 * Deliver workspace: format picker + save-to-library + full-resolution export.
 * Renders inside the canvas column (below the stage), gated on hasImage by the parent.
 */
export default function DeliveryWorkspace({
  exportFormat,
  setExportFormat,
  saveToLibrary,
  exportPhoto,
  busy,
}: DeliveryWorkspaceProps): React.JSX.Element {
  return (
    <div className="export-bar" id="export-workspace">
      <label className="format-select">
        Export as{' '}
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as DeliveryFormat)}
        >
          <option value="image/jpeg">JPEG · High quality</option>
          <option value="image/png">PNG · Lossless</option>
          <option value="image/webp">WebP · Compact</option>
        </select>
      </label>
      <button className="button button-quiet" onClick={saveToLibrary} disabled={busy}>
        <Save size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Save to library
      </button>
      <button className="button button-primary" onClick={exportPhoto} disabled={busy}>
        <Download size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Export photo
      </button>
    </div>
  );
}
