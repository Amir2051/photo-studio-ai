<script lang="ts">
  import { tools } from '$lib/editor/tools';
  import { timelineActions } from '$lib/editor/timeline-interactions';
  import { activeTool, selection } from '$lib/stores/app';
  import { activeSequence, history, undo, redo } from '$lib/project/store';
  import Icon from './Icon.svelte';
</script>

<div class="tool-strip" role="toolbar" aria-label="Timeline tools and quick edits" aria-orientation="vertical">
  <div class="tool-group" aria-label="Timeline tools">
    {#each tools as tool (tool.id)}
      <button
        class="tool-btn"
        class:active={$activeTool === tool.id}
        title="{tool.label} ({tool.shortcut})"
        aria-label={tool.label}
        aria-pressed={$activeTool === tool.id}
        onclick={() => activeTool.set(tool.id)}>
        <Icon name={tool.icon} size={16} />
      </button>
    {/each}
  </div>

  <span class="tool-divider"></span>

  <div class="tool-group quick-edits" aria-label="Quick edit actions">
    <button class="tool-btn quick" title="Split at playhead (Ctrl+K)" aria-label="Split at playhead" disabled={!$activeSequence} onclick={() => timelineActions.splitAtPlayhead(false)}>
      <Icon name="razor" size={16} />
    </button>
    <button class="tool-btn quick" title="Delete selected clips (Delete)" aria-label="Delete selected clips" disabled={!$activeSequence || $selection.length === 0} onclick={() => timelineActions.deleteSelection()}>
      <Icon name="trash" size={15} />
    </button>
    <button class="tool-btn quick" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!$history.canUndo} onclick={undo}>
      <Icon name="undo" size={15} />
    </button>
    <button class="tool-btn quick" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!$history.canRedo} onclick={redo}>
      <Icon name="redo" size={15} />
    </button>
  </div>
</div>

<style>
  .tool-strip {
    width: var(--toolbar-h);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    background: linear-gradient(180deg, var(--bg-surface), #0a1221);
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }

  .tool-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
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
    border-color: rgba(141, 165, 255, 0.28);
    box-shadow: inset 2px 0 0 var(--accent);
  }

  .tool-btn:disabled {
    opacity: 0.28;
  }

  .tool-divider {
    width: 22px;
    height: 1px;
    background: var(--border);
  }

  .quick-edits .tool-btn {
    color: var(--text-muted);
  }

  .quick-edits .tool-btn:hover:not(:disabled) {
    color: var(--accent);
  }
</style>
