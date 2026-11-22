import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  clearCompletedProposals, clearProposals, createEditProposal, editProposals,
  pendingProposalCount, updateProposalOperation, validateProposalOperation,
} from './proposals';
import { project } from '#lib/project/store.ts';

const operation = (over = {}) => ({
  tool: 'add_marker', args: { time: 2, name: 'review' }, summary: 'Add a marker', ...over,
});
const input = (ops = [operation()]) => ({
  projectId: 'p1', sequenceId: 's1', sequenceName: 'Main', operations: ops,
});

describe('P1 — editing proposal safety', () => {
  beforeEach(() => {
    clearProposals();
    project.set(null);
  });

  it('creates a proposal without touching project state or applying edits', () => {
    const before = get(project);
    const proposal = createEditProposal(input());
    expect(get(editProposals)).toHaveLength(1);
    expect(proposal.operations[0].status).toBe('pending');
    expect(get(project)).toBe(before);
    expect(get(pendingProposalCount)).toBe(1);
  });

  it('rejects empty, oversized and incomplete proposals', () => {
    expect(() => createEditProposal(input([]))).toThrow(/between 1 and 20/);
    expect(() => createEditProposal(input(Array.from({ length: 21 }, () => operation())))).toThrow(/between 1 and 20/);
    expect(() => createEditProposal({ ...input(), projectId: 123 as unknown as string })).toThrow(/projectId/);
    expect(() => validateProposalOperation({ tool: 'add_marker', summary: 'missing args' })).toThrow();
  });

  it('rejects unsupported tools and invalid argument values', () => {
    expect(() => validateProposalOperation({ tool: 'export', args: {}, summary: 'x' })).toThrow(/Unsupported proposal tool/);
    expect(() => validateProposalOperation({ tool: 'add_marker', args: { time: -1 }, summary: 'x' })).toThrow();
    expect(() => validateProposalOperation({ tool: 'add_title', args: { text: 5 }, summary: 'x' })).toThrow();
  });

  it('stores an independent operation list after creation', () => {
    const ops = [operation()];
    const proposal = createEditProposal(input(ops));
    ops.push(operation({ summary: 'Injected later' }));
    expect(get(editProposals)[0].operations).toHaveLength(1);
    expect(proposal.operations).toHaveLength(1);
  });

  it('records explicit approval/rejection/failure without auto-applying', () => {
    const proposal = createEditProposal(input([operation(), operation({ summary: 'Second marker' })]));
    updateProposalOperation(proposal.id, proposal.operations[0].id, 'applied');
    updateProposalOperation(proposal.id, proposal.operations[1].id, 'failed', 'provider unavailable');
    const stored = get(editProposals)[0];
    expect(stored.operations[0].status).toBe('applied');
    expect(stored.operations[1].status).toBe('failed');
    expect(stored.operations[1].error).toContain('provider unavailable');
    expect(get(project)).toBeNull();
  });

  it('clears only completed proposals and resets preview state', () => {
    const proposal = createEditProposal(input([operation(), operation({ summary: 'Keep me' })]));
    updateProposalOperation(proposal.id, proposal.operations[0].id, 'rejected');
    clearCompletedProposals();
    expect(get(editProposals)).toHaveLength(1);
    clearProposals();
    expect(get(editProposals)).toEqual([]);
  });
});
