import { describe, expect, it } from 'vitest';
import { createSequence, createTitleClip } from '#lib/project/defaults.ts';
import { parseProject, serializeProject } from '#lib/project/serialize.ts';
import type { MediaItem, Project } from '#lib/project/types.ts';
import { checkLegacyCompatibility, legacyBraincutToSuiteDocument, projectToSuiteDocument, suiteDocumentToProject } from './braincut';
import { mediaIdentity } from '../media';

function item(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'm1',
    name: 'clip.mp4',
    kind: 'video',
    binId: null,
    duration: 8,
    width: 1920,
    height: 1080,
    fps: 30,
    hasVideo: true,
    hasAudio: true,
    channels: 2,
    sampleRate: 48000,
    videoCodec: 'avc',
    audioCodec: 'aac',
    container: 'mp4',
    mimeType: 'video/mp4',
    fileSize: 123456,
    rotation: 0,
    alpha: false,
    status: 'ready',
    proxy: null,
    converted: null,
    thumbnail: null,
    label: 'none',
    addedAt: 5,
    fileName: 'clip.mp4',
    lastModified: 99,
    relativePath: 'camera/clip.mp4',
    ...over,
  };
}

function project(): Project {
  const seq = createSequence({ name: 'Sequence 1', width: 1920, height: 1080, fps: 30 });
  seq.tracks[0].clips.push(createTitleClip(0, 2, 'Title'));
  return {
    id: 'p1',
    name: 'Trial project',
    version: 1,
    createdAt: 10,
    modifiedAt: 20,
    media: [item()],
    bins: [],
    sequences: [seq],
    activeSequenceId: seq.id,
  };
}

describe('braincut <-> suite adapter', () => {
  it('maps a video project media item to a shared media ref', () => {
    const doc = projectToSuiteDocument(project());
    expect(doc.studio).toBe('video');
    expect(doc.media).toHaveLength(1);
    expect(doc.media[0]).toMatchObject({
      id: 'm1',
      name: 'clip.mp4',
      fileName: 'clip.mp4',
      kind: 'video',
      origin: 'user-file',
      availability: 'ready',
      identity: mediaIdentity('clip.mp4', 123456, 99),
      reference: 'm1',
      bytes: 123456,
      duration: 8,
      lastModified: 99,
      relativePath: 'camera/clip.mp4',
    });
  });

  it('round-trips the exact legacy project through the suite payload', () => {
    const original = project();
    const doc = projectToSuiteDocument(original);
    expect(suiteDocumentToProject(doc)).toEqual(original);
  });

  it('wraps an existing .braincut v1 file without modification', () => {
    const text = serializeProject(project());
    const doc = legacyBraincutToSuiteDocument(text);
    expect(doc.format).toBe('minu-suite');
    expect(doc.version).toBe(1);
    expect(doc.name).toBe('Trial project');
    expect(suiteDocumentToProject(doc)).toEqual(parseProject(text));
  });

  it('preserves missing-media status and proxy/generated origins', () => {
    const original = project();
    original.media = [
      item({ id: 'm2', status: 'missing', fileName: 'gone.mp4' }),
      item({ id: 'm3', proxy: { key: 'opfs:proxy', width: 960, height: 540 } }),
      item({ id: 'm4', kind: 'audio', mimeType: 'audio/aac' }),
    ];
    const doc = projectToSuiteDocument(original);
    expect(doc.media.map((m) => m.availability)).toEqual(['missing', 'ready', 'ready']);
    expect(doc.media.map((m) => m.origin)).toEqual(['user-file', 'proxy', 'user-file']);
    expect(doc.media.map((m) => m.kind)).toEqual(['video', 'video', 'audio']);
  });

  it('fails loudly when a suite payload is not a valid legacy project', () => {
    const doc = projectToSuiteDocument(project());
    doc.payload = { name: 'broken' };
    expect(() => suiteDocumentToProject(doc)).toThrow();
  });

  it('reports a passing compatibility checkpoint for a valid legacy file', () => {
    const original = project();
    const check = checkLegacyCompatibility(serializeProject(original));
    expect(check.ok).toBe(true);
    expect(check.reason).toBeNull();
    expect(check.documentId).toBe(original.id);
    expect(check.documentName).toBe(original.name);
    expect(check.mediaCount).toBe(1);
  });

  it('reports malformed input without throwing', () => {
    const check = checkLegacyCompatibility('{not a project');
    expect(check.ok).toBe(false);
    expect(check.reason).toBeTruthy();
    expect(check.mediaCount).toBe(0);
  });

  it('keeps unknown legacy fields out of the checkpoint verdict without dropping native data', () => {
    const raw = JSON.parse(serializeProject(project())) as Record<string, unknown>;
    raw.futureEditorNote = { keep: 'me' };
    const text = JSON.stringify(raw);
    const check = checkLegacyCompatibility(text);
    // both canonical forms come from the same strict v1 parser, so the
    // checkpoint stays green; the native parser (not the adapter) decides what
    // is preserved on save
    expect(check.ok).toBe(true);
    expect(parseProject(text).name).toBe('Trial project');
  });
});
