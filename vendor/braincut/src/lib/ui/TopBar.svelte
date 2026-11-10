<script lang="ts">
  import { base } from '$app/paths';
  import Logo from './Logo.svelte';
  import Icon from './Icon.svelte';
  import { project, dirty, history, undo, redo } from '$lib/project/store';
  import { commandPaletteOpen, dialog, workspace, type Workspace } from '$lib/stores/app';

  let {
    onimport,
    onsave,
    onexport,
    onopen
  }: {
    onimport: () => void;
    onsave: () => void;
    onexport: () => void;
    onopen: () => void;
  } = $props();

  const workspaces: { id: Workspace; label: string }[] = [
    { id: 'edit', label: 'Edit' },
    { id: 'color', label: 'Color' },
    { id: 'effects', label: 'Effects' },
    { id: 'audio', label: 'Audio' }
  ];

  function renameProject() {
    const current = $project;
    if (!current) return;
    dialog.set({ kind: 'rename', target: 'project', id: current.id });
  }
</script>

<div class="topbar">
  <div class="topbar-left">
    <a href="{base}/" class="logo" title="Every Frame First Video Studio">
      <span class="logo-icon"><Logo size={20} /></span>
      <span class="logo-text">EVERY FRAME FIRST</span>
    </a>
    <span class="separator"></span>
    {#if $project}
      <div class="file-info">
        <button class="filename" onclick={renameProject} title="Rename the project">{$project.name}</button>
        <span class="save-dot" class:saved={!$dirty} class:unsaved={$dirty} title={$dirty ? 'Unsaved changes' : 'Saved'}
        ></span>
      </div>
    {:else}
      <span class="filename muted">No project</span>
    {/if}
  </div>

  <div class="workspaces">
    {#each workspaces as ws (ws.id)}
      <button class="tool-btn" class:active={$workspace === ws.id} onclick={() => workspace.set(ws.id)}>
        {ws.label}
      </button>
    {/each}
  </div>

  <div class="topbar-actions">
    <button class="action-btn" onclick={onopen} title="Open a project file (Ctrl+O)">
      <Icon name="folder" size={14} />
      <span>Open</span>
    </button>
    <button class="action-btn" onclick={onimport} disabled={!$project} title={$project ? 'Import video and audio footage (Ctrl+I)' : 'Create a video project before importing footage'}>
      <Icon name="importIcon" size={14} />
      <span>Add media</span>
    </button>
    <button class="action-btn" onclick={onsave} title="Save the project (Ctrl+S)">
      <Icon name="save" size={14} />
      <span>Save</span>
    </button>
    <span class="separator"></span>
    <button
      class="action-btn icon-only"
      onclick={undo}
      disabled={!$history.canUndo}
      title={$history.undoLabel ? `Undo ${$history.undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)'}
      aria-label="Undo">
      <Icon name="undo" size={14} />
    </button>
    <button
      class="action-btn icon-only"
      onclick={redo}
      disabled={!$history.canRedo}
      title={$history.redoLabel ? `Redo ${$history.redoLabel} (Ctrl+Shift+Z)` : 'Redo (Ctrl+Shift+Z)'}
      aria-label="Redo">
      <Icon name="redo" size={14} />
    </button>
    <span class="separator"></span>
    <button
      class="action-btn icon-only"
      onclick={() => commandPaletteOpen.set(true)}
      title="Command palette (Ctrl+Shift+P)"
      aria-label="Command palette">
      <span class="cmd-glyph">&#8984;</span>
    </button>
    <button
      class="action-btn icon-only"
      onclick={() => dialog.set({ kind: 'preferences' })}
      title="Preferences (Ctrl+,)"
      aria-label="Preferences">
      <Icon name="settings" size={14} />
    </button>
    <button class="action-btn accent" onclick={onexport} title="Export the sequence (Ctrl+M)">
      <Icon name="export" size={14} />
      <span>Export</span>
    </button>
  </div>
</div>

<style>
  .topbar {
    height: var(--topbar-h);
    background: linear-gradient(90deg, #0d172b 0%, #101b31 55%, #111a2d 100%);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 5px 22px rgba(0, 0, 0, 0.18);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    flex-shrink: 0;
    gap: 10px;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    flex-shrink: 0;
    padding: 5px 9px;
    border-radius: var(--radius-md);
  }

  .logo-icon {
    display: flex;
    align-items: center;
    color: var(--accent);
  }

  .logo-text {
    font-family: var(--font-brand);
    font-style: italic;
    font-size: 13px;
    letter-spacing: 0.09em;
    white-space: nowrap;
    color: var(--text-primary);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .filename {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--font-editor);
    padding: 1px 4px;
  }

  .filename:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .filename.muted {
    color: var(--text-muted);
    cursor: default;
  }

  .save-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .save-dot.saved {
    background: var(--success);
  }

  .save-dot.unsaved {
    background: var(--accent);
  }

  .workspaces {
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 7px 12px;
    color: var(--text-secondary);
    font-size: 11.5px;
    border-radius: var(--radius-md);
  }

  .tool-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .tool-btn.active {
    background: var(--accent-dim);
    color: var(--accent);
    box-shadow: inset 0 -2px 0 var(--accent);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    flex: 1;
    justify-content: flex-end;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 11px;
    font-size: 11.5px;
    border-radius: var(--radius-md);
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .action-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .action-btn.accent {
    background: linear-gradient(135deg, #91a8ff, #a68cff);
    color: #0a1020;
    box-shadow: 0 3px 12px rgba(119, 137, 255, 0.22);
  }

  .action-btn.accent:hover:not(:disabled) {
    background: #b6c3ff;
    color: #0a1020;
  }

  .action-btn.icon-only {
    padding: 5px 7px;
  }

  .cmd-glyph {
    font-size: 13px;
    line-height: 14px;
  }

  .separator {
    width: 1px;
    height: 16px;
    background: var(--border);
    margin: 0 3px;
    flex-shrink: 0;
  }

  /* the labels are the first thing to go on a narrow window, the icons carry
     the meaning on their own */
  .action-btn span:not(.cmd-glyph) {
    display: none;
  }

  @media (min-width: 768px) {
    .action-btn span:not(.cmd-glyph) {
      display: inline;
    }
  }

  @media (max-width: 600px) {
    .logo-text {
      display: none;
    }

    .workspaces {
      display: none;
    }
  }
</style>
