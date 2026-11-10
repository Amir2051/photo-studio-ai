<script lang="ts">
  import { tools } from '$lib/editor/tools';
  import { timelineActions } from '$lib/editor/timeline-interactions';
  import { activeTool, selection } from '$lib/stores/app';
  import { activeSequence, history, undo, redo } from '$lib/project/store';
  import Icon from './Icon.svelte';
</script>

<div class="tool-strip" role="toolbar" aria-label="Timeline tools and quick edits" aria-orientation="horizontal">
  <div class="tool-group" aria-label="Timeline tools">
    {#each tools as tool (tool.id)}
      <button
        class="tool-btn"
        class:active={$activeTool === tool.id}
        title="{tool.label} ({tool.shortcut})"
        aria-label={tool.label}
        aria-pressed={$activeTool === tool.id}
        onclick={() => activeTool.set(tool.id)}>
        <Icon name={tool.icon} size={15} />
        <span class="tool-label">{tool.label}</span>
      </button>
    {/each}
  </div>

  <span class="tool-divider"></span>

  <div class="tool-group quick-edits" aria-label="Quick edit actions">
    <button class="tool-btn quick" title="Split at playhead (Ctrl+K)" aria-label="Split at playhead" disabled={!$activeSequence} onclick={() => timelineActions.splitAtPlayhead(false)}>
      <Icon name="razor" size={15} />
      <span class="tool-label">Split</span>
    </button>
    <button class="tool-btn quick" title="Delete selected clips (Delete)" aria-label="Delete selected clips" disabled={!$activeSequence || $selection.length === 0} onclick={() => timelineActions.deleteSelection()}>
      <Icon name="trash" size={14} />
      <span class="tool-label">Delete</span>
    </button>
    <button class="tool-btn quick" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!$history.canUndo} onclick={undo}>
      <Icon name="undo" size={14} />
      <span class="tool-label">Undo</span>
    </button>
    <button class="tool-btn quick" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={!$history.canRedo} onclick={redo}>
      <Icon name="redo" size={14} />
      <span class="tool-label">Redo</span>
    </button>
  </div>
</div>

<style>
  .tool-strip {
    min-height: 42px;
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 5px 10px;
    background: linear-gradient(90deg, var(--bg-surface), #0a1221);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    overflow-y: hidden;
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
    min-width: 34px;
    height: 30px;
    padding: 0 8px;
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
    border-color: rgba(141, 165, 255, 0.28);
    box-shadow: inset 0 -2px 0 var(--accent);
  }

  .tool-btn:disabled {
    opacity: 0.28;
  }

  .tool-label {
    font-size: 10px;
    white-space: nowrap;
  }

  .tool-divider {
    width: 1px;
    height: 22px;
    background: var(--border);
    flex-shrink: 0;
  }

  .quick-edits .tool-btn {
    color: var(--text-muted);
  }

  .quick-edits .tool-btn:hover:not(:disabled) {
    color: var(--accent);
  }
</style>
