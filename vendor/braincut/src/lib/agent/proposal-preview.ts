import { get } from 'svelte/store';
import { playhead } from '#lib/stores/app.ts';
import { preferences as editorPreferences } from '#lib/stores/preferences.ts';
import { preview, project } from '#lib/project/store.ts';
import { createClipFromMedia, createMarker, createTitleClip, clipEnd } from '#lib/project/defaults.ts';
import { snapToFrame } from '#lib/project/time.ts';
import { isAudioTransitionType, transitionDef } from '#lib/engine/transitions/registry.ts';
import * as ops from '#lib/project/ops.ts';
import type { Clip, Project, Sequence, Track, TrackKind } from '#lib/project/types.ts';
import type { ProposalOperation } from './proposals.ts';

export interface ProposalPreviewFocus {
  sequenceId: string;
  time: number;
  clipIds: string[];
}

function sequenceFor(draft: Project, sequenceId?: string): Sequence {
  const id = sequenceId || draft.activeSequenceId || draft.sequences[0]?.id;
  const sequence = draft.sequences.find((item) => item.id === id);
  if (!sequence) throw new Error('The proposal sequence is no longer available');
  const activeId = draft.activeSequenceId ?? draft.sequences[0]?.id;
  if (activeId && sequence.id !== activeId) throw new Error('Switch to the target sequence before previewing this edit');
  return sequence;
}

function sequenceWithClip(draft: Project, clipId: string): { sequence: Sequence; clip: Clip; track: Track } {
  for (const sequence of draft.sequences) {
    const found = ops.findClipById(sequence, clipId);
    if (found) {
      const activeId = draft.activeSequenceId ?? draft.sequences[0]?.id;
      if (activeId && sequence.id !== activeId) throw new Error('Switch to the target sequence before previewing this edit');
      return { sequence, clip: found.clip, track: found.track };
    }
  }
  throw new Error(`Clip ${clipId} is no longer in the project`);
}

function tracksOfKind(sequence: Sequence, kind: TrackKind): Track[] {
  return sequence.tracks.filter((track) => track.kind === kind);
}

function trackAt(sequence: Sequence, kind: TrackKind, index: number): Track {
  if (!Number.isInteger(index) || index < 0 || index > 32) throw new Error('Invalid target track');
  while (tracksOfKind(sequence, kind).length <= index) ops.addTrack(sequence, kind);
  return tracksOfKind(sequence, kind)[index];
}

function lastEnd(track: Track): number {
  return track.clips.reduce((end, clip) => Math.max(end, clipEnd(clip)), 0);
}

function applyToDraft(draft: Project, operation: ProposalOperation, focus: ProposalPreviewFocus): void {
  switch (operation.tool) {
    case 'add_clip': {
      const args = operation.args;
      const media = draft.media.find((item) => item.id === args.mediaId);
      if (!media) throw new Error('The proposed media item is no longer in the project');
      if (media.status !== 'ready') throw new Error(`${media.name} is ${media.status} and cannot be placed`);
      const sequence = sequenceFor(draft, args.sequenceId);
      const kind: TrackKind = media.kind === 'audio' ? 'audio' : 'video';
      const track = trackAt(sequence, kind, args.trackIndex ?? 0);
      const audioTrack = kind === 'video' && media.hasAudio ? trackAt(sequence, 'audio', args.trackIndex ?? 0) : null;
      const start = args.at === undefined || args.at === 'end'
        ? Math.max(lastEnd(track), audioTrack ? lastEnd(audioTrack) : 0)
        : snapToFrame(Math.max(0, args.at), sequence.fps);
      const made = createClipFromMedia(media, start, {
        fps: sequence.fps,
        in: args.sourceIn,
        duration: args.sourceOut !== undefined ? args.sourceOut - (args.sourceIn ?? 0) : undefined,
        stillDuration: get(editorPreferences).stillImageDuration,
      });
      const placements: ops.Placement[] = [];
      if (made.video) placements.push({ trackId: track.id, clip: made.video });
      if (made.audio) placements.push({ trackId: (audioTrack ?? track).id, clip: made.audio });
      const placed = ops.placeClips(sequence, placements, 'overwrite');
      if (!placed.length) throw new Error('The clip could not be placed; the target track may be locked');
      focus.sequenceId = sequence.id;
      focus.time = start;
      focus.clipIds = placed;
      return;
    }
    case 'add_title': {
      const args = operation.args;
      const sequence = sequenceFor(draft, args.sequenceId);
      const videoTracks = tracksOfKind(sequence, 'video');
      const track = args.trackIndex === undefined
        ? videoTracks[videoTracks.length - 1] ?? trackAt(sequence, 'video', 0)
        : trackAt(sequence, 'video', args.trackIndex);
      const start = snapToFrame(Math.max(0, args.at ?? get(playhead)), sequence.fps);
      const duration = Math.max(1 / sequence.fps, snapToFrame(args.duration ?? 5, sequence.fps));
      const clip = createTitleClip(start, duration, args.text);
      const title = clip.title!;
      if (args.fontFamily) title.fontFamily = args.fontFamily;
      if (args.fontSize !== undefined) title.fontSize = Math.max(1, args.fontSize);
      if (args.fontWeight !== undefined) {
        title.fontWeight = Math.min(700, Math.max(400, Math.round(args.fontWeight / 100) * 100)) as 400 | 500 | 600 | 700;
      }
      if (args.color) title.color = args.color;
      if (args.align) title.align = args.align;
      if (args.strokeWidth || args.strokeColor) title.stroke = { color: args.strokeColor ?? '#000000', width: args.strokeWidth ?? 4 };
      if (args.shadow) title.shadow = { color: '#000000', blur: 12, x: 0, y: 4 };
      if (args.box) title.background = { color: args.boxColor ?? '#000000', padding: 24 };
      const fraction = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
      if (args.x !== undefined) title.box = { ...title.box, x: fraction(Math.min(1 - title.box.width, args.x - title.box.width / 2)) };
      if (args.y !== undefined) title.box = { ...title.box, y: fraction(args.y) };
      const placed = ops.placeClips(sequence, [{ trackId: track.id, clip }], 'overwrite');
      if (!placed.length) throw new Error('The title could not be placed; the target track may be locked');
      focus.sequenceId = sequence.id;
      focus.time = start;
      focus.clipIds = placed;
      return;
    }
    case 'split': {
      const args = operation.args;
      const target = args.clipId ? sequenceWithClip(draft, args.clipId) : null;
      const sequence = target?.sequence ?? sequenceFor(draft, args.sequenceId);
      const time = snapToFrame(args.at, sequence.fps);
      const before = target ? ops.linkedClips(sequence, args.clipId!).map((clip) => clip.id) : ops.clipsAt(sequence, time).map((clip) => clip.id);
      const right = ops.splitClipsAt(sequence, time, target ? before : 'all-unlocked');
      if (!right.length) throw new Error('Nothing to split at that time; it must fall inside a clip');
      focus.sequenceId = sequence.id;
      focus.time = time;
      focus.clipIds = right;
      return;
    }
    case 'trim': {
      const args = operation.args;
      const { sequence } = sequenceWithClip(draft, args.clipId);
      const linkedIds = ops.linkedClips(sequence, args.clipId).map((clip) => clip.id);
      const trimOptions = { ripple: Boolean(args.ripple), getMedia: (mediaId: string) => draft.media.find((item) => item.id === mediaId) };
      if (args.start !== undefined) {
        ops.trimEdges(sequence, linkedIds.map((clipId) => ({ clipId, edge: 'head' as const })), snapToFrame(args.start, sequence.fps), trimOptions);
      }
      if (args.end !== undefined) {
        ops.trimEdges(sequence, linkedIds.map((clipId) => ({ clipId, edge: 'tail' as const })), snapToFrame(args.end, sequence.fps), trimOptions);
      }
      focus.sequenceId = sequence.id;
      focus.time = args.start ?? args.end ?? get(playhead);
      focus.clipIds = [args.clipId];
      return;
    }
    case 'move_clip': {
      const args = operation.args;
      const { sequence, track } = sequenceWithClip(draft, args.clipId);
      const target = args.trackIndex === undefined ? track : trackAt(sequence, track.kind, args.trackIndex);
      const start = snapToFrame(args.to, sequence.fps);
      const moved = ops.moveClips(sequence, [{ clipId: args.clipId, trackId: target.id, start }], 'overwrite', { keepLinked: true });
      if (!moved) throw new Error('The clip could not be moved to the requested position');
      focus.sequenceId = sequence.id;
      focus.time = start;
      focus.clipIds = [args.clipId];
      return;
    }
    case 'delete_clips': {
      const args = operation.args;
      const first = sequenceWithClip(draft, args.clipIds[0]);
      const sequence = first.sequence;
      const ids = [...new Set(args.clipIds.flatMap((clipId) => {
        const located = sequenceWithClip(draft, clipId);
        if (located.sequence.id !== sequence.id) throw new Error('A delete proposal cannot span multiple sequences');
        return ops.linkedClips(sequence, clipId).map((clip) => clip.id);
      }))];
      if (args.ripple) ops.rippleDelete(sequence, ids);
      else ops.deleteClips(sequence, ids);
      focus.sequenceId = sequence.id;
      focus.time = first.clip.start;
      focus.clipIds = [];
      return;
    }
    case 'add_transition': {
      const args = operation.args;
      const { sequence } = sequenceWithClip(draft, args.clipId);
      const requested = args.type;
      if (requested && !transitionDef(requested)) throw new Error(`Unknown transition: ${requested}`);
      const side = args.edge === 'in' ? 'in' : 'out';
      const prefs = get(editorPreferences);
      const length = Math.max(0.04, args.duration ?? prefs.defaultTransitionDuration);
      let created = 0;
      for (const clip of ops.linkedClips(sequence, args.clipId)) {
        const track = ops.trackOf(sequence, clip.id);
        if (!track) continue;
        const index = track.clips.findIndex((item) => item.id === clip.id);
        const neighbour = side === 'in' ? track.clips[index - 1] : track.clips[index + 1];
        const adjacent = neighbour !== undefined && (side === 'in'
          ? Math.abs(clipEnd(neighbour) - clip.start) < 1e-6
          : Math.abs(clipEnd(clip) - neighbour.start) < 1e-6);
        const videoType = requested && !isAudioTransitionType(requested) ? requested : prefs.defaultVideoTransition;
        const audioType = requested && isAudioTransitionType(requested) ? requested : prefs.defaultAudioTransition;
        const result = ops.addTransition(sequence, track.id, {
          type: track.kind === 'audio' ? audioType : videoType,
          leftClipId: side === 'in' ? (adjacent ? neighbour.id : null) : clip.id,
          rightClipId: side === 'in' ? clip.id : adjacent ? neighbour.id : null,
          duration: length,
        });
        if (result) created++;
      }
      if (!created) throw new Error('No valid cut was found for this transition');
      const clip = ops.findClipById(sequence, args.clipId)?.clip;
      focus.sequenceId = sequence.id;
      focus.time = clip?.start ?? get(playhead);
      focus.clipIds = [args.clipId];
      return;
    }
    case 'add_marker': {
      const args = operation.args;
      const sequence = sequenceFor(draft, args.sequenceId);
      const time = snapToFrame(args.time, sequence.fps);
      ops.addMarker(sequence, createMarker(time, { name: args.name ?? '', color: args.color ?? 'green' }));
      focus.sequenceId = sequence.id;
      focus.time = time;
      focus.clipIds = [];
      return;
    }
  }
}

export function previewProposalOperation(operation: ProposalOperation): ProposalPreviewFocus {
  if (!get(project)) throw new Error('Open a project before previewing an AI edit');
  const focus: ProposalPreviewFocus = { sequenceId: '', time: get(playhead), clipIds: [] };
  preview((draft) => applyToDraft(draft, operation, focus), { commitOnEdit: false });
  return focus;
}
