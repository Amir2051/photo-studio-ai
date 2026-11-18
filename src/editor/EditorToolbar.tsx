import React from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Save,
  Download,
  Undo2,
  Redo2,
  RotateCcw,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  LayoutGrid,
  Scissors,
} from 'lucide-react';

export interface EditorToolbarProps {
  activeSection: string;
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  busy: boolean;
  onNavigate: (section: string, target: string) => void;
  onImport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onSave: () => void;
  onExport: () => void;
}

/**
 * Professional editor top toolbar: brand, workspace switcher, import,
 * history actions and deliver actions. Renders the .pro-topbar grid child.
 */
export default function EditorToolbar({
  activeSection,
  canUndo,
  canRedo,
  hasImage,
  busy,
  onNavigate,
  onImport,
  onUndo,
  onRedo,
  onReset,
  onSave,
  onExport,
}: EditorToolbarProps): React.JSX.Element {
  const tab = (section: string, target: string, label: string, Icon: React.ElementType) => {
    const active =
      section === 'editor'
        ? activeSection === 'home' || activeSection === 'editor'
        : activeSection === section;
    return (
      <button
        type="button"
        className={`pro-workspace-tab ${active ? 'active' : ''}`}
        onClick={() => onNavigate(section, target)}
        aria-pressed={active}
      >
        <Icon size={15} aria-hidden="true" /> {label}
      </button>
    );
  };

  return (
    <header className="pro-topbar">
      <a className="brand" href={import.meta.env.BASE_URL} aria-label="Minu Studio home">
        <span className="brand-mark">MS</span>
        <span className="brand-name">
          MINU STUDIO
          <small>PHOTO EDITOR</small>
        </span>
      </a>
      <div className="pro-topbar-divider" aria-hidden="true" />
      {tab('editor', 'editor-canvas', 'Photo', ImageIcon)}
      {tab('retouch', 'retouch-workspace', 'Retouch', Wand2)}
      {tab('effects', 'effects-workspace', 'Effects', Sparkles)}
      {tab('assets', 'assets-workspace', 'Batch', LayoutGrid)}
      {tab('export', 'export-workspace', 'Deliver', Download)}
      <Link to="/cull" className="pro-workspace-tab">
        <Scissors size={15} aria-hidden="true" /> Culling
      </Link>
      <div className="pro-topbar-spacer" />
      <span className="pro-state-pill" title="All processing happens on your device. No uploads.">
        <i aria-hidden="true" /> LOCAL
      </span>
      <button
        className="pro-icon-btn"
        onClick={onImport}
        title="Import photo"
        aria-label="Import photo"
      >
        <Upload size={15} aria-hidden="true" />
        <span>Import</span>
      </button>
      <button className="pro-icon-btn" disabled={!canUndo} onClick={onUndo} title="Undo" aria-label="Undo">
        <Undo2 size={15} aria-hidden="true" />
      </button>
      <button className="pro-icon-btn" disabled={!canRedo} onClick={onRedo} title="Redo" aria-label="Redo">
        <Redo2 size={15} aria-hidden="true" />
      </button>
      <button className="pro-icon-btn" onClick={onReset} disabled={!hasImage} title="Reset all edits" aria-label="Reset all edits">
        <RotateCcw size={15} aria-hidden="true" />
      </button>
      <button className="pro-icon-btn" onClick={onSave} disabled={!hasImage || busy} title="Save a copy to the local library" aria-label="Save to library">
        <Save size={15} aria-hidden="true" />
      </button>
      <button className="pro-icon-btn primary" onClick={onExport} disabled={!hasImage || busy} title="Export photo" aria-label="Export photo">
        <Download size={15} aria-hidden="true" />
        <span>Export</span>
      </button>
    </header>
  );
}
