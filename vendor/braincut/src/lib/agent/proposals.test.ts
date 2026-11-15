import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  clearCompletedProposals,
  clearProposals,
  createEditProposal,
  editProposals,
  pendingProposalCount,
  updateProposalOperation,
  validateProposalOperation,
} from './proposals';

describe('AI edit proposals', () => {
  beforeEach(() => clearProposals());

  it('validates and stores a typed proposal without applying it', () => {
    const proposal = createEditProposal({
      projectId: 'project-1',
      sequenceId: 'sequence-1',
      sequenceName: 'Main sequence',
      title: 'Tighten the opening',
      summary: 'A short opening edit.',
      operations: [
        { tool: 'trim', args: { clipId: 'clip-1', end: 4.5 }, summary: 'Trim the first shot', rationale: 'Remove the pause.' },
        { tool: 'add_title', args: { text: 'The story begins', at: 0, duration: 2 }, summary: 'Add the opening title' },
      ],
    });

    expect(get(editProposals)).toHaveLength(1);
    expect(proposal.operations).toHaveLength(2);
    expect(proposal.operations.every((operation) => operation.status === 'pending')).toBe(true);
    expect(get(pendingProposalCount)).toBe(2);
  });

  it('rejects unknown tools, extra fields, and invalid time values', () => {
    expect(() => validateProposalOperation({ tool: 'export', args: {}, summary: 'Upload' })).toThrow(/Unsupported proposal tool/);
    expect(() => validateProposalOperation({ tool: 'move_clip', args: { clipId: 'c1', to: -2 }, summary: 'Move' })).toThrow(/greater than or equal to 0/);
    expect(() => validateProposalOperation({ tool: 'add_clip', args: { mediaId: 'm1', overwriteAll: true }, summary: 'Add' })).toThrow(/unsupported argument/);
  });

  it('updates individual decisions and clears completed proposals only', () => {
    const proposal = createEditProposal({
      projectId: 'project-1',
      sequenceId: 'sequence-1',
      sequenceName: 'Main sequence',
      operations: [
        { tool: 'split', args: { at: 2 }, summary: 'Split at two seconds' },
        { tool: 'add_marker', args: { time: 5 }, summary: 'Add a marker' },
      ],
    });

    updateProposalOperation(proposal.id, proposal.operations[0].id, 'applied');
    expect(get(pendingProposalCount)).toBe(1);
    clearCompletedProposals();
    expect(get(editProposals)).toHaveLength(1);
    expect(get(editProposals)[0].operations).toHaveLength(2);

    updateProposalOperation(proposal.id, proposal.operations[1].id, 'rejected');
    expect(get(pendingProposalCount)).toBe(0);
    clearCompletedProposals();
    expect(get(editProposals)).toHaveLength(0);
  });
});
