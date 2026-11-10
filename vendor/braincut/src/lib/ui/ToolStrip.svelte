<script lang="ts">
  import { tools } from '#lib/editor/tools.ts';
  import { timelineActions } from '#lib/editor/timeline-interactions.ts';
  import { activeTool, selection } from '#lib/stores/app.ts';
  import { activeSequence, history, undo, redo } from '#lib/project/store.ts';
  import Icon from './Icon.svelte';
  import Menu from './Menu.svelte';

  const primaryToolIds = new Set(['select', 'razor', 'hand', 'text']);
  const primaryTools = tools.filter((tool) => primaryToolIds.has(tool.id));
  const advancedTools = $derived(
    tools
      .filter((tool) => !primaryToolIds.has(tool.id))
      .map((tool) => ({
        label: `${tool.label}  ·  ${tool.shortcut}`,
        checked: $activeTool === tool.id,
        action: () => activeTool.set(tool.id)
      }))
  );
</script>

<div class="tool-strip" role="toolbar" aria-label="Editing tools and quick actions" aria-orientation="horizontal">
  <div class="tool-section tools-section" aria-label="Editing tools">
    <span class="section-label">TOOLS</span>
    <div class="tool-group">
      {#each primaryTools as tool (tool.id)}
        <button
          class="tool-btn"
          class:active={$activeTool === tool.id}
          title={`${tool.label} tool · shortcut ${tool.shortcut}`}
          aria-label={tool.label}
          aria-pressed={$activeTool === tool.id}
          onclick={() => activeTool.set(tool.id)}>
          <Icon name={tool.icon} size={16} />
          <span class="tool-label">{tool.id === 'select' ? 'Select' : tool.id === 'razor' ? 'Razor' : tool.id === 'hand' ? 'Hand' : 'Text'}</span>
          <kbd>{tool.shortcut}</kbd>
        </button>
      {/each}
      <Menu items={advancedTools}>
        {#snippet trigger({ open, toggle })}
          <button class="tool-btn more-btn" class:active={open} onclick={toggle} title="More timeline tools">
            <Icon name="more" size={16} />
            <span class="tool-label">More tools</span>
            <Icon name="chevronDown" size={11} />
          </button>
        {/snippet}
      </Menu>
    </div>
  </div>

  <span class="tool-divider"></span>

  <div class="tool-section edits-section" aria-label="Clip editing actions">
    <span class="section-label">CLIP ACTIONS</span>
    <div class="tool-group">
      <button class="tool-btn action-primary" title="Split clips at the playhead (Ctrl+K)" aria-label="Split at playhead" disabled={!$activeSequence} onclick={() => timelineActions.splitAtPlayhead(false)}>
        <Icon name="razor" size={16} />
        <span class="tool-label">Split</span>
        <kbd>Ctrl K</kbd>
      </button>
      <button class="tool-btn" title="Remove selected clips and close the gap (Shift+Delete)" aria-label="Ripple delete" disabled={!$activeSequence || $selection.length === 0} onclick={() => timelineActions.rippleDeleteSelection()}>
        <Icon name="ripple" size={15} />
        <span class="tool-label">Ripple delete</span>
      </button>
      <button class="tool-btn" title="Delete selected clips" aria-label="Delete selected clips" disabled={!$activeSequence || $selection.length === 0} onclick={() => timelineActions.deleteSelection()}>
        <Icon name="trash" size={15} />
        <span class="tool-label">Delete</span>
      </button>
      <button class="tool-btn" title="Add a marker at the playhead (M)" aria-label="Add marker" disabled={!$activeSequence} onclick={() => timelineActions.addMarkerAtPlayhead()}>
        <Icon name="marker" size={15} />
        <span class="tool-label">Marker</span>
      </button>
    </div>
  </div>

  <span class="tool-divider"></span>

  <div class="tool-section history-section" aria-label="Undo and redo">
    <span class="section-label">HISTORY</span>
    <div class="tool-group">
      <button class="tool-btn icon-action" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!$history.canUndo} onclick={undo}>
        <Icon name="undo" size={16} />
        <span class="tool-label">Undo</span>
      </button>
      <button class="tool-btn icon-action" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!$history.canRedo} onclick={redo}>
        <Icon name="redo" size={16} />
        <span class="tool-label">Redo</span>
      </button>
    </div>
  </div>
</div>

<style>
  .tool-strip {
    min-height: 62px;
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: 6px 12px;
    background: linear-gradient(90deg, var(--bg-surface), #0a1221);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .tool-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .section-label {
    padding-left: 3px;
    color: var(--text-muted);
    font-family: var(--font-editor);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 10px;
  }

  .tool-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 54px;
    height: 36px;
    padding: 0 9px;
    gap: 6px;
    color: var(--text-secondary);
    flex-shrink: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }

  .tool-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border);
  }

  .tool-btn.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: rgba(141, 165, 255, 0.32);
    box-shadow: inset 0 -2px 0 var(--accent);
  }

  .tool-btn:disabled {
    opacity: 0.28;
    cursor: default;
  }

  .tool-label {
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }

  kbd {
    padding: 1px 4px;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text-muted);
    font-family: var(--font-editor);
    font-size: 9px;
    line-height: 13px;
    white-space: nowrap;
  }

  .more-btn {
    border-color: var(--border);
    background: rgba(255, 255, 255, 0.025);
  }

  .action-primary {
    color: var(--accent);
    border-color: rgba(141, 165, 255, 0.3);
    background: var(--accent-dim);
  }

  .action-primary:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--accent-dim);
  }

  .tool-divider {
    width: 1px;
    height: 38px;
    background: var(--border);
    flex-shrink: 0;
  }

  .history-section .tool-btn {
    min-width: 44px;
  }

  @media (max-width: 760px) {
    .tool-strip {
      gap: 9px;
      padding-inline: 8px;
    }

    .tool-btn {
      padding-inline: 7px;
    }

    .history-section .tool-label {
      display: none;
    }
  }
</style>
