import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createClipFromMedia, createProject, createSequence } from '#lib/project/defaults.ts';
import { cancelPreview, commitPreview, dirty, edit, history, isPreviewing, loadProject, project, setActiveSequence } from '#lib/project/store.ts';
import type { MediaItem } from '#lib/project/types.ts';
import { previewProposalOperation } from './proposal-preview';
import { validateProposalOperation } from './proposals';

function media(): MediaItem {
  return {
    id: 'm1', name: 'opening.mp4', kind: 'video', binId: null, duration: 10,
    width: 1920, height: 1080, fps: 25, hasVideo: true, hasAudio: true,
    channels: 2, sampleRate: 48000, videoCodec: 'avc', audioCodec: 'aac',
    container: 'mp4', mimeType: 'video/mp4', fileSize: 100, rotation: 0,
    alpha: false, status: 'ready', proxy: null, converted: null, thumbnail: null,
    label: 'none', addedAt: 0,
  };
}

function fresh(): void {
  const p = createProject('preview test');
  const sequence = createSequence({ name: 'Main', width: 1920, height: 1080, fps: 25 });
  p.sequences.push(sequence);
  p.activeSequenceId = sequence.id;
  p.media.push(media());
  loadProject(p);
}

function freshWithClip(): { videoId: string; audioId: string } {
  const p = createProject('preview test');
  const sequence = createSequence({ name: 'Main', width: 1920, height: 1080, fps: 25 });
  const item = media();
  const made = createClipFromMedia(item, 0, { fps: 25 });
  sequence.tracks[0].clips.push(made.video!);
  sequence.tracks[3].clips.push(made.audio!);
  p.sequences.push(sequence);
  p.activeSequenceId = sequence.id;
  p.media.push(item);
  loadProject(p);
  return { videoId: made.video!.id, audioId: made.audio!.id };
}

const addClip = () => validateProposalOperation({
  tool: 'add_clip',
  args: { mediaId: 'm1', at: 1, sourceIn: 0, sourceOut: 4 },
  summary: 'Place the opening shot at one second',
});

describe('AI edit preview', () => {
  beforeEach(fresh);

  it('shows a temporary timeline preview without dirtying the project or adding history', () => {
    const focus = previewProposalOperation(addClip());
    expect(focus.time).toBe(1);
    expect(get(isPreviewing)).toBe(true);
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(1);
    expect(get(project)!.sequences[0].tracks[0].clips[0].start).toBe(1);
    expect(get(dirty)).toBe(false);
    expect(get(history).entries).toHaveLength(0);

    cancelPreview();
    expect(get(isPreviewing)).toBe(false);
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(0);
    expect(get(history).entries).toHaveLength(0);
    expect(get(dirty)).toBe(false);
  });

  it('previews a title on the timeline and restores it when cancelled', () => {
    const operation = validateProposalOperation({ tool: 'add_title', args: { text: 'The story begins', at: 0, duration: 2 }, summary: 'Add the opening title' });
    previewProposalOperation(operation);
    expect(get(project)!.sequences[0].tracks[2].clips).toHaveLength(1);
    expect(get(project)!.sequences[0].tracks[2].clips[0].title?.text).toBe('The story begins');
    cancelPreview();
    expect(get(project)!.sequences[0].tracks[2].clips).toHaveLength(0);
  });

  it('previews a linked split without losing the original clips on cancel', () => {
    const { videoId } = freshWithClip();
    const operation = validateProposalOperation({ tool: 'split', args: { clipId: videoId, at: 2 }, summary: 'Split the opening shot' });
    previewProposalOperation(operation);
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(2);
    expect(get(project)!.sequences[0].tracks[3].clips).toHaveLength(2);
    cancelPreview();
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(1);
    expect(get(project)!.sequences[0].tracks[3].clips).toHaveLength(1);
  });

  it('previews trim and move operations without committing them', () => {
    const { videoId } = freshWithClip();
    previewProposalOperation(validateProposalOperation({ tool: 'trim', args: { clipId: videoId, start: 2 }, summary: 'Trim the head' }));
    expect(get(project)!.sequences[0].tracks[0].clips[0].start).toBe(2);
    cancelPreview();
    expect(get(project)!.sequences[0].tracks[0].clips[0].start).toBe(0);

    previewProposalOperation(validateProposalOperation({ tool: 'move_clip', args: { clipId: videoId, to: 5 }, summary: 'Move the shot' }));
    expect(get(project)!.sequences[0].tracks[0].clips[0].start).toBe(5);
    cancelPreview();
    expect(get(project)!.sequences[0].tracks[0].clips[0].start).toBe(0);
  });

  it('previews linked deletion and restores both tracks when cancelled', () => {
    const { videoId } = freshWithClip();
    previewProposalOperation(validateProposalOperation({ tool: 'delete_clips', args: { clipIds: [videoId] }, summary: 'Remove the shot' }));
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(0);
    expect(get(project)!.sequences[0].tracks[3].clips).toHaveLength(0);
    cancelPreview();
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(1);
    expect(get(project)!.sequences[0].tracks[3].clips).toHaveLength(1);
  });

  it('previews markers without dirtying the project', () => {
    previewProposalOperation(validateProposalOperation({ tool: 'add_marker', args: { time: 3, name: 'Hook' }, summary: 'Mark the hook' }));
    expect(get(project)!.sequences[0].markers).toHaveLength(1);
    expect(get(project)!.sequences[0].markers[0].name).toBe('Hook');
    expect(get(dirty)).toBe(false);
    cancelPreview();
    expect(get(project)!.sequences[0].markers).toHaveLength(0);
  });

  it('previews a transition at a cut and restores it on cancel', () => {
    const p = createProject('transition preview');
    const sequence = createSequence({ name: 'Main', width: 1920, height: 1080, fps: 25 });
    const item = media();
    const first = createClipFromMedia(item, 0, { fps: 25, duration: 4 });
    const second = createClipFromMedia(item, 4, { fps: 25, in: 4, duration: 4 });
    sequence.tracks[0].clips.push(first.video!, second.video!);
    sequence.tracks[3].clips.push(first.audio!, second.audio!);
    p.sequences.push(sequence);
    p.activeSequenceId = sequence.id;
    p.media.push(item);
    loadProject(p);
    previewProposalOperation(validateProposalOperation({ tool: 'add_transition', args: { clipId: first.video!.id, edge: 'out' }, summary: 'Add a cut transition' }));
    expect(get(project)!.sequences[0].tracks[0].transitions).toHaveLength(1);
    cancelPreview();
    expect(get(project)!.sequences[0].tracks[0].transitions).toHaveLength(0);
  });

  it('commits an approved preview as exactly one undoable history step', () => {
    previewProposalOperation(addClip());
    commitPreview('AI edit: Place the opening shot');

    expect(get(isPreviewing)).toBe(false);
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(1);
    expect(get(history).entries).toEqual(['AI edit: Place the opening shot']);
    expect(get(dirty)).toBe(true);
  });

  it('cancels an unapproved AI preview before a normal user edit', () => {
    previewProposalOperation(addClip());
    edit('rename project', (draft) => { draft.name = 'My cut'; });

    expect(get(isPreviewing)).toBe(false);
    expect(get(project)!.name).toBe('My cut');
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(0);
    expect(get(history).entries).toEqual(['rename project']);
  });

  it('cancels a preview when switching sequences', () => {
    const current = structuredClone(get(project)!);
    const second = createSequence({ name: 'Alt', width: 1280, height: 720, fps: 30 });
    current.sequences.push(second);
    loadProject(current);
    const operation = addClip();
    previewProposalOperation(operation);
    setActiveSequence(second.id);

    expect(get(isPreviewing)).toBe(false);
    expect(get(project)!.sequences[0].tracks[0].clips).toHaveLength(0);
    expect(get(project)!.activeSequenceId).toBe(second.id);
  });
});
