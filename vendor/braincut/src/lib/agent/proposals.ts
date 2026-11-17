import { derived, writable } from 'svelte/store';
import { id } from '#lib/project/ids.ts';
import { cancelPreview } from '#lib/project/store.ts';
import type { Label } from '#lib/project/types.ts';

export type ProposalOperationStatus = 'pending' | 'applied' | 'rejected' | 'failed';

export interface ProposalArgsByTool {
  add_clip: {
    mediaId: string;
    at?: number | 'end';
    trackIndex?: number;
    sourceIn?: number;
    sourceOut?: number;
    sequenceId?: string;
  };
  add_title: {
    text: string;
    at?: number;
    duration?: number;
    trackIndex?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    strokeWidth?: number;
    strokeColor?: string;
    shadow?: boolean;
    box?: boolean;
    boxColor?: string;
    x?: number;
    y?: number;
    sequenceId?: string;
  };
  split: { at: number; clipId?: string; sequenceId?: string };
  trim: { clipId: string; start?: number; end?: number; ripple?: boolean };
  move_clip: { clipId: string; to: number; trackIndex?: number };
  delete_clips: { clipIds: string[]; ripple?: boolean };
  add_transition: { clipId: string; type?: string; duration?: number; edge?: 'in' | 'out' };
  add_marker: { time: number; name?: string; color?: Label; sequenceId?: string };
}

export type ProposedTool = keyof ProposalArgsByTool;

type OperationBase<K extends ProposedTool> = {
  id: string;
  tool: K;
  args: ProposalArgsByTool[K];
  summary: string;
  rationale: string;
  status: ProposalOperationStatus;
  error?: string;
};

export type ProposalOperation = {
  [K in ProposedTool]: OperationBase<K>;
}[ProposedTool];

export interface EditProposal {
  id: string;
  projectId: string;
  sequenceId: string | null;
  sequenceName: string;
  title: string;
  summary: string;
  source: string;
  createdAt: number;
  operations: ProposalOperation[];
}

export interface ActiveProposalPreview {
  proposalId: string;
  operationId: string;
  projectId: string;
  sequenceId: string;
  previousPlayhead: number;
  focusClipIds: string[];
}

export const editProposals = writable<EditProposal[]>([]);
export const activeProposalPreview = writable<ActiveProposalPreview | null>(null);
export const pendingProposalCount = derived(editProposals, ($items) =>
  $items.reduce((total, proposal) => total + proposal.operations.filter((op) => op.status === 'pending').length, 0),
);
export const completedProposalCount = derived(editProposals, ($items) =>
  $items.filter((proposal) => proposal.operations.length > 0 && proposal.operations.every((op) => op.status !== 'pending')).length,
);

const fields: Record<ProposedTool, readonly string[]> = {
  add_clip: ['mediaId', 'at', 'trackIndex', 'sourceIn', 'sourceOut', 'sequenceId'],
  add_title: [
    'text', 'at', 'duration', 'trackIndex', 'fontFamily', 'fontSize', 'fontWeight', 'color',
    'align', 'strokeWidth', 'strokeColor', 'shadow', 'box', 'boxColor', 'x', 'y', 'sequenceId',
  ],
  split: ['at', 'clipId', 'sequenceId'],
  trim: ['clipId', 'start', 'end', 'ripple'],
  move_clip: ['clipId', 'to', 'trackIndex'],
  delete_clips: ['clipIds', 'ripple'],
  add_transition: ['clipId', 'type', 'duration', 'edge'],
  add_marker: ['time', 'name', 'color', 'sequenceId'],
};

const required: Record<ProposedTool, readonly string[]> = {
  add_clip: ['mediaId'],
  add_title: ['text'],
  split: ['at'],
  trim: ['clipId'],
  move_clip: ['clipId', 'to'],
  delete_clips: ['clipIds'],
  add_transition: ['clipId'],
  add_marker: ['time'],
};

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Record<string, unknown>;
}

function string(value: unknown, name: string, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${name} must be a non-empty string of at most ${max} characters`);
  }
  return value.trim();
}

function optionalString(value: unknown, name: string, max = 200): void {
  if (value !== undefined && value !== null) string(value, name, max);
}

function number(value: unknown, name: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new Error(`${name} must be a finite number greater than or equal to ${min}`);
  }
  return value;
}

function optionalNumber(value: unknown, name: string, min = 0): void {
  if (value !== undefined && value !== null) number(value, name, min);
}

function optionalIndex(value: unknown, name: string): void {
  if (value === undefined || value === null) return;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 32) {
    throw new Error(`${name} must be a whole number from 0 to 32`);
  }
}

function optionalBoolean(value: unknown, name: string): void {
  if (value !== undefined && typeof value !== 'boolean') throw new Error(`${name} must be true or false`);
}


function validateArgs(tool: ProposedTool, raw: unknown): ProposalArgsByTool[ProposedTool] {
  const args = record(raw, 'args');
  const unknown = Object.keys(args).filter((key) => !fields[tool].includes(key));
  if (unknown.length) throw new Error(`${tool} contains unsupported argument(s): ${unknown.join(', ')}`);
  for (const key of required[tool]) if (args[key] === undefined || args[key] === null) throw new Error(`${tool}.${key} is required`);

  switch (tool) {
    case 'add_clip':
      string(args.mediaId, 'mediaId', 128);
      if (args.at !== undefined && args.at !== 'end') number(args.at, 'at');
      optionalIndex(args.trackIndex, 'trackIndex');
      optionalNumber(args.sourceIn, 'sourceIn');
      optionalNumber(args.sourceOut, 'sourceOut');
      optionalString(args.sequenceId, 'sequenceId', 128);
      if (typeof args.sourceIn === 'number' && typeof args.sourceOut === 'number' && args.sourceOut <= args.sourceIn) {
        throw new Error('sourceOut must be after sourceIn');
      }
      break;
    case 'add_title':
      string(args.text, 'text', 500);
      optionalNumber(args.at, 'at');
      optionalNumber(args.duration, 'duration', 0.001);
      optionalIndex(args.trackIndex, 'trackIndex');
      optionalString(args.fontFamily, 'fontFamily', 100);
      optionalNumber(args.fontSize, 'fontSize', 1);
      optionalNumber(args.fontWeight, 'fontWeight', 400);
      optionalString(args.color, 'color', 32);
      optionalString(args.strokeColor, 'strokeColor', 32);
      optionalNumber(args.strokeWidth, 'strokeWidth');
      optionalString(args.boxColor, 'boxColor', 32);
      optionalNumber(args.x, 'x');
      optionalNumber(args.y, 'y');
      optionalString(args.sequenceId, 'sequenceId', 128);
      optionalBoolean(args.shadow, 'shadow');
      optionalBoolean(args.box, 'box');
      if (args.align !== undefined && !['left', 'center', 'right'].includes(String(args.align))) {
        throw new Error('align must be left, center, or right');
      }
      if (typeof args.x === 'number' && args.x > 1) throw new Error('x must be between 0 and 1');
      if (typeof args.y === 'number' && args.y > 1) throw new Error('y must be between 0 and 1');
      break;
    case 'split':
      number(args.at, 'at');
      optionalString(args.clipId, 'clipId', 128);
      optionalString(args.sequenceId, 'sequenceId', 128);
      break;
    case 'trim':
      string(args.clipId, 'clipId', 128);
      optionalNumber(args.start, 'start');
      optionalNumber(args.end, 'end');
      optionalBoolean(args.ripple, 'ripple');
      if (args.start === undefined && args.end === undefined) throw new Error('trim requires start, end, or both');
      break;
    case 'move_clip':
      string(args.clipId, 'clipId', 128);
      number(args.to, 'to');
      optionalIndex(args.trackIndex, 'trackIndex');
      break;
    case 'delete_clips':
      if (!Array.isArray(args.clipIds) || args.clipIds.length < 1 || args.clipIds.length > 50) {
        throw new Error('clipIds must contain between 1 and 50 clip IDs');
      }
      args.clipIds.forEach((value, index) => string(value, `clipIds[${index}]`, 128));
      optionalBoolean(args.ripple, 'ripple');
      break;
    case 'add_transition':
      string(args.clipId, 'clipId', 128);
      optionalString(args.type, 'type', 100);
      optionalNumber(args.duration, 'duration', 0.001);
      if (args.edge !== undefined && args.edge !== 'in' && args.edge !== 'out') throw new Error('edge must be in or out');
      break;
    case 'add_marker':
      number(args.time, 'time');
      optionalString(args.name, 'name', 120);
      optionalString(args.sequenceId, 'sequenceId', 128);
      if (args.color !== undefined && !['none','violet','iris','caribbean','lavender','cerulean','forest','rose','mango','purple','blue','teal','magenta','tan','green','brown','yellow'].includes(String(args.color))) {
        throw new Error('color is not a supported marker label');
      }
      break;
  }
  return args as ProposalArgsByTool[ProposedTool];
}

export function validateProposalOperation(value: unknown): ProposalOperation {
  const input = record(value, 'operation');
  const tool = input.tool;
  if (typeof tool !== 'string' || !Object.prototype.hasOwnProperty.call(fields, tool)) {
    throw new Error(`Unsupported proposal tool "${String(tool)}"`);
  }
  const typedTool = tool as ProposedTool;
  const summary = string(input.summary, 'operation.summary', 180);
  const rationale = input.rationale === undefined ? '' : string(input.rationale, 'operation.rationale', 500);
  const args = validateArgs(typedTool, input.args);
  return { id: id(), tool: typedTool, args, summary, rationale, status: 'pending' } as ProposalOperation;
}

export function createEditProposal(input: {
  projectId: string;
  sequenceId: string | null;
  sequenceName: string;
  title?: string;
  summary?: string;
  source?: string;
  operations: unknown[];
}): EditProposal {
  if (!Array.isArray(input.operations) || input.operations.length < 1 || input.operations.length > 20) {
    throw new Error('A proposal must contain between 1 and 20 operations');
  }
  const proposal: EditProposal = {
    id: id(),
    projectId: string(input.projectId, 'projectId', 128),
    sequenceId: input.sequenceId,
    sequenceName: string(input.sequenceName, 'sequenceName', 120),
    title: input.title ? string(input.title, 'title', 120) : 'AI edit proposal',
    summary: input.summary ? string(input.summary, 'summary', 500) : `${input.operations.length} proposed timeline edits`,
    source: input.source ? string(input.source, 'source', 60) : 'Connected agent',
    createdAt: Date.now(),
    operations: input.operations.map(validateProposalOperation),
  };
  editProposals.update((items) => [...items, proposal]);
  return proposal;
}

export function updateProposalOperation(
  proposalId: string,
  operationId: string,
  status: ProposalOperationStatus,
  error?: string,
): void {
  editProposals.update((items) => items.map((proposal) => {
    if (proposal.id !== proposalId) return proposal;
    return {
      ...proposal,
      operations: proposal.operations.map((operation) => operation.id === operationId
        ? { ...operation, status, error: error ? error.slice(0, 500) : undefined }
        : operation),
    };
  }));
}

export function clearCompletedProposals(): void {
  editProposals.update((items) => items.filter((proposal) => proposal.operations.some((op) => op.status === 'pending')));
}

export function clearProposals(): void {
  cancelPreview();
  editProposals.set([]);
  activeProposalPreview.set(null);
}
