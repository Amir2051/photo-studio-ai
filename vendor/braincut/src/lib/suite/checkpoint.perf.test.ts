// Isolated M2a correction harness. Normal test runs skip it; enable with:
//   $env:M2A_BENCH='1'; npx vitest run src/lib/suite/checkpoint.perf.test.ts
// It generates synthetic .braincut JSON in memory and compares the ordinary
// parse+serialize cost with checkLegacyCompatibility. No production behavior
// is changed by this file.
import { describe, it } from 'vitest';
import { createSequence, createTitleClip } from '#lib/project/defaults.ts';
import { parseProject, serializeProject } from '#lib/project/serialize.ts';
import type { MediaItem, Project } from '#lib/project/types.ts';
import { checkLegacyCompatibility } from './adapters/braincut';

function mediaItem(i: number): MediaItem {
  return {
    id: `m${i}`,
    name: `clip-${i}.mp4`,
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
    fileSize: 279481 + i,
    rotation: 0,
    alpha: false,
    status: 'ready',
    proxy: null,
    converted: null,
    thumbnail: null,
    label: 'none',
    addedAt: i,
    fileName: `clip-${i}.mp4`,
    lastModified: 1795133667008 + i,
  };
}

function makeProject(mediaCount: number, clipCount: number): Project {
  const seq = createSequence({ name: 'Sequence 1', width: 1920, height: 1080, fps: 30 });
  for (let i = 0; i < clipCount; i++) {
    seq.tracks[0].clips.push(createTitleClip((i % 2000) * 0.2, 0.2, `Clip ${i}`));
  }
  return {
    id: 'bench-project',
    name: 'Benchmark project',
    version: 1,
    createdAt: 1,
    modifiedAt: 2,
    media: Array.from({ length: mediaCount }, (_, i) => mediaItem(i)),
    bins: [],
    sequences: [seq],
    activeSequenceId: seq.id,
  };
}

function measure(label: string, media: number, clips: number, operations: number) {
  const text = serializeProject(makeProject(media, clips));
  const bytes = Buffer.byteLength(text, 'utf8');
  // warm up both code paths
  for (let i = 0; i < 3; i++) {
    serializeProject(parseProject(text));
    checkLegacyCompatibility(text);
  }
  let baselineMs = 0;
  let checkpointMs = 0;
  for (let i = 0; i < operations; i++) {
    let t = performance.now();
    serializeProject(parseProject(text));
    baselineMs += performance.now() - t;
    t = performance.now();
    checkLegacyCompatibility(text);
    checkpointMs += performance.now() - t;
  }
  return {
    label,
    bytes,
    media,
    clips,
    operations,
    baselineMs: +baselineMs.toFixed(2),
    baselineMsPerOp: +(baselineMs / operations).toFixed(3),
    checkpointMs: +checkpointMs.toFixed(2),
    checkpointMsPerOp: +(checkpointMs / operations).toFixed(3),
    overheadMsPerOp: +((checkpointMs - baselineMs) / operations).toFixed(3),
    factor: +(checkpointMs / baselineMs).toFixed(2),
  };
}

describe.skipIf(!process.env.M2A_BENCH)('checkpoint overhead harness', () => {
  it('measures small/medium/large synthetic projects', () => {
    const results = [
      measure('small', 2, 5, 20),
      measure('medium', 30, 300, 12),
      measure('large', 300, 2500, 6),
    ];
    console.log('BENCH_RESULTS=' + JSON.stringify(results));
  }, 180000);
});
