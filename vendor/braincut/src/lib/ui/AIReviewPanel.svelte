<script lang="ts">
  import { get } from 'svelte/store';
  import Icon from './Icon.svelte';
  import { activeSequence, findClip, project } from '#lib/project/store.ts';
  import { cancelPreview, commitPreview, isPreviewing } from '#lib/project/store.ts';
  import { formatTimecode } from '#lib/project/time.ts';
  import { addToast, playhead, selection } from '#lib/stores/app.ts';
  import {
    activeProposalPreview,
    clearCompletedProposals,
    completedProposalCount,
    editProposals,
    pendingProposalCount,
    updateProposalOperation,
    type EditProposal,
    type ProposalOperation,
  } from '#lib/agent/proposals.ts';
  import { previewProposalOperation } from '#lib/agent/proposal-preview.ts';

  const timeKeys = new Set(['at', 'start', 'end', 'to', 'time', 'sourceIn', 'sourceOut', 'duration']);

  function readableValue(proposal: EditProposal, key: string, value: unknown): string {
    const current = get(project);
    const sequence = current?.sequences.find((item) => item.id === proposal.sequenceId) ?? get(activeSequence);
    const fps = sequence?.fps ?? 25;
    if (key === 'mediaId' && typeof value === 'string') {
      return current?.media.find((item) => item.id === value)?.name ?? 'Media item no longer available';
    }
    if (key === 'clipId' && typeof value === 'string') {
      return current ? findClip(current, value)?.clip.name ?? 'Clip no longer available' : 'Clip';
    }
    if (key === 'clipIds' && Array.isArray(value)) {
      return value.map((id) => typeof id === 'string' && current ? findClip(current, id)?.clip.name ?? 'Missing clip' : 'Clip').join(', ');
    }
    if (key === 'sequenceId' && typeof value === 'string') {
      return current?.sequences.find((item) => item.id === value)?.name ?? 'Sequence';
    }
    if (key === 'at' && value === 'end') return 'End of sequence';
    if (typeof value === 'number' && timeKeys.has(key)) {
      return `${formatTimecode(value, fps)} (${value.toFixed(2)}s)`;
    }
    if (key === 'trackIndex' && typeof value === 'number') return `Track ${value + 1}`;
    if (typeof value === 'string') return value.length > 110 ? `${value.slice(0, 107)}…` : value;
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  }

  function argsSummary(proposal: EditProposal, operation: ProposalOperation): string[] {
    return Object.entries(operation.args).map(([key, value]) => `${key}: ${readableValue(proposal, key, value)}`);
  }

  function cancelActivePreview(): void {
    const active = get(activeProposalPreview);
    if (!active) return;
    cancelPreview();
    const current = get(project);
    const sequence = get(activeSequence);
    if (current?.id === active.projectId && sequence?.id === active.sequenceId) {
      playhead.set(active.previousPlayhead);
    }
    activeProposalPreview.set(null);
  }

  function preview(proposal: EditProposal, operation: ProposalOperation): void {
    const current = get(project);
    const sequence = get(activeSequence);
    if (!current || !sequence || current.id !== proposal.projectId) {
      addToast('This proposal belongs to a different project. It cannot be previewed.', 'warning', 5000);
      return;
    }
    if (proposal.sequenceId && proposal.sequenceId !== sequence.id) {
      addToast(`Switch to ${proposal.sequenceName} before previewing this edit.`, 'warning', 5000);
      return;
    }
    cancelActivePreview();
    const previousPlayhead = get(playhead);
    try {
      const focus = previewProposalOperation(operation);
      activeProposalPreview.set({
        proposalId: proposal.id,
        operationId: operation.id,
        projectId: current.id,
        sequenceId: focus.sequenceId || sequence.id,
        previousPlayhead,
        focusClipIds: focus.clipIds,
      });
      playhead.set(focus.time);
    } catch (error) {
      cancelPreview();
      const message = error instanceof Error ? error.message : String(error);
      addToast(`Preview unavailable: ${message}`, 'error', 6000);
    }
  }

  function applyPreview(proposal: EditProposal, operation: ProposalOperation): void {
    const active = get(activeProposalPreview);
    if (!active || active.proposalId !== proposal.id || active.operationId !== operation.id || !get(isPreviewing)) return;
    try {
      commitPreview(`AI edit: ${operation.summary}`);
      if (active.focusClipIds.length) selection.set(active.focusClipIds);
      updateProposalOperation(proposal.id, operation.id, 'applied');
      activeProposalPreview.set(null);
      addToast('AI edit applied and added to History. You can undo it there.', 'success', 5000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addToast(`Could not apply preview: ${message}`, 'error', 6000);
    }
  }

  function reject(proposal: EditProposal, operation: ProposalOperation): void {
    const active = get(activeProposalPreview);
    if (active?.proposalId === proposal.id && active.operationId === operation.id) cancelActivePreview();
    updateProposalOperation(proposal.id, operation.id, 'rejected');
  }

  function statusLabel(status: ProposalOperation['status']): string {
    if (status === 'applied') return 'Applied · in History';
    if (status === 'rejected') return 'Rejected';
    if (status === 'failed') return 'Needs attention';
    return 'Awaiting review';
  }

  function formatDate(value: number): string {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
</script>

<div class="ai-review">
  <div class="review-toolbar">
    <div class="toolbar-copy">
      <span class="eyebrow">AI EDIT REVIEW</span>
      <span class="count">{$pendingProposalCount} pending</span>
    </div>
    <button class="clear-btn" disabled={$completedProposalCount === 0 || $activeProposalPreview !== null} onclick={clearCompletedProposals}>
      <Icon name="check-check" size={13} />
      Clear completed
    </button>
  </div>

  {#if $activeProposalPreview}
    <div class="preview-banner">
      <Icon name="eye" size={14} />
      <span>Preview is temporary. Apply it to create one undoable History step, or cancel to restore the original timeline.</span>
    </div>
  {/if}

  <div class="proposal-list">
    {#if $editProposals.length === 0}
      <div class="empty-state">
        <div class="empty-icon"><Icon name="sparkles" size={22} /></div>
        <strong>No AI edits to review</strong>
        <p>When the connected agent proposes cuts, trims, titles, or transitions, each edit will appear here for preview and individual approval.</p>
        <span>Nothing is changed until you apply an edit.</span>
      </div>
    {:else}
      {#each $editProposals as proposal (proposal.id)}
        <article class="proposal-card">
          <div class="proposal-heading">
            <div class="proposal-title-wrap">
              <span class="proposal-source">{proposal.source} · {formatDate(proposal.createdAt)}</span>
              <h3>{proposal.title}</h3>
              <p>{proposal.summary}</p>
            </div>
            <span class="sequence-tag">{proposal.sequenceName}</span>
          </div>

          <div class="operation-list">
            {#each proposal.operations as operation (operation.id)}
              {@const active = $activeProposalPreview?.proposalId === proposal.id && $activeProposalPreview?.operationId === operation.id}
              <section class="operation" class:previewing={active} class:completed={operation.status !== 'pending'}>
                <div class="operation-topline">
                  <span class="tool-name">{operation.tool.replace(/_/g, ' ')}</span>
                  <span class="operation-status" data-status={operation.status}>{statusLabel(operation.status)}</span>
                </div>
                <strong class="operation-summary">{operation.summary}</strong>
                {#if operation.rationale}
                  <p class="rationale">{operation.rationale}</p>
                {/if}
                <div class="argument-list">
                  {#each argsSummary(proposal, operation) as item, index (index)}
                    <span class="argument">{item}</span>
                  {/each}
                </div>
                {#if operation.error}
                  <p class="error-message">{operation.error}</p>
                {/if}
                {#if operation.status === 'pending'}
                  <div class="operation-actions">
                    {#if active}
                      <button class="apply-btn" onclick={() => applyPreview(proposal, operation)}>
                        <Icon name="check" size={13} /> Apply edit
                      </button>
                      <button class="secondary-btn" onclick={cancelActivePreview}>
                        Cancel preview
                      </button>
                    {:else}
                      <button class="preview-btn" disabled={$activeProposalPreview !== null} onclick={() => preview(proposal, operation)}>
                        <Icon name="eye" size={13} /> Preview
                      </button>
                      <button class="reject-btn" disabled={$activeProposalPreview !== null} onclick={() => reject(proposal, operation)}>
                        Reject
                      </button>
                    {/if}
                  </div>
                {/if}
              </section>
            {/each}
          </div>
        </article>
      {/each}
    {/if}
  </div>
</div>

<style>
  .ai-review { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--bg-elevated); }
  .review-toolbar { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 10px; border-bottom: 1px solid var(--border); }
  .toolbar-copy { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .eyebrow { color: var(--text-muted); font-size: 9px; font-weight: 700; letter-spacing: .1em; }
  .count { color: var(--text-secondary); font-family: var(--font-editor); font-size: 10px; }
  .clear-btn, .secondary-btn, .reject-btn, .preview-btn, .apply-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border-radius: 4px; font-size: 10.5px; font-weight: 600; padding: 5px 8px; white-space: nowrap; }
  .clear-btn, .secondary-btn, .reject-btn { color: var(--text-secondary); border: 1px solid var(--border); background: var(--bg-surface); }
  .clear-btn:hover:not(:disabled), .secondary-btn:hover, .reject-btn:hover:not(:disabled) { color: var(--text-primary); background: var(--bg-hover); }
  .clear-btn:disabled, .reject-btn:disabled { opacity: .35; cursor: default; }
  .preview-banner { display: flex; align-items: flex-start; gap: 7px; padding: 8px 10px; color: var(--accent); background: var(--accent-dim); border-bottom: 1px solid var(--border); font-size: 10.5px; line-height: 1.4; }
  .preview-banner :global(svg) { flex: 0 0 auto; margin-top: 1px; }
  .proposal-list { flex: 1; min-height: 0; overflow: auto; padding: 9px; display: flex; flex-direction: column; gap: 9px; }
  .empty-state { margin: auto; max-width: 270px; text-align: center; padding: 26px 12px; color: var(--text-muted); }
  .empty-icon { width: 42px; height: 42px; display: grid; place-items: center; margin: 0 auto 12px; border: 1px solid var(--border); border-radius: 12px; color: var(--accent); background: var(--bg-surface); }
  .empty-state strong { display: block; color: var(--text-primary); font-size: 12px; }
  .empty-state p { font-size: 11px; line-height: 1.5; margin: 7px 0; }
  .empty-state > span { font-size: 10px; color: var(--text-muted); }
  .proposal-card { border: 1px solid var(--border); border-radius: 6px; background: var(--bg-surface); overflow: hidden; }
  .proposal-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 10px; border-bottom: 1px solid var(--border); }
  .proposal-title-wrap { min-width: 0; }
  .proposal-source { color: var(--text-muted); font-size: 9px; text-transform: uppercase; letter-spacing: .06em; }
  h3 { margin: 4px 0 2px; color: var(--text-primary); font-size: 12px; font-weight: 700; }
  .proposal-heading p { margin: 0; color: var(--text-secondary); font-size: 10.5px; line-height: 1.4; }
  .sequence-tag { flex: 0 0 auto; max-width: 92px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid var(--border); border-radius: 3px; padding: 3px 5px; color: var(--text-muted); font-size: 9px; }
  .operation-list { display: flex; flex-direction: column; }
  .operation { padding: 9px 10px; border-bottom: 1px solid var(--border); }
  .operation:last-child { border-bottom: 0; }
  .operation.previewing { background: color-mix(in srgb, var(--accent-dim) 45%, transparent); }
  .operation.completed { opacity: .7; }
  .operation-topline { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
  .tool-name { color: var(--text-muted); font-family: var(--font-editor); font-size: 9px; text-transform: uppercase; letter-spacing: .06em; }
  .operation-status { color: var(--text-muted); font-size: 9px; white-space: nowrap; }
  .operation-status[data-status='applied'] { color: var(--success); }
  .operation-status[data-status='failed'] { color: var(--error); }
  .operation-summary { display: block; color: var(--text-primary); font-size: 11px; line-height: 1.4; }
  .rationale { margin: 4px 0 0; color: var(--text-secondary); font-size: 10px; line-height: 1.45; }
  .argument-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
  .argument { max-width: 100%; overflow-wrap: anywhere; padding: 3px 5px; border: 1px solid var(--border); border-radius: 3px; color: var(--text-muted); background: var(--bg-deep); font-family: var(--font-editor); font-size: 9px; }
  .error-message { margin: 6px 0 0; color: var(--error); font-size: 10px; }
  .operation-actions { display: flex; gap: 6px; margin-top: 9px; }
  .preview-btn { color: var(--text-primary); border: 1px solid var(--border); background: var(--bg-hover); }
  .preview-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .preview-btn:disabled { opacity: .35; cursor: default; }
  .apply-btn { color: #fff; border: 1px solid var(--accent); background: var(--accent); }
  .apply-btn:hover { filter: brightness(1.08); }
</style>
