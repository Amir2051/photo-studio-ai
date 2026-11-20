// Adapter between the existing braincut .braincut v1 model and the shared
// suite document. The native project is preserved verbatim in `payload`, so a
// suite document round-trips to the exact same legacy project without a
// format migration. No existing file, store or UI path is changed here.

import { parseProject, serializeProject } from '#lib/project/serialize.ts';
import type { MediaItem, Project } from '#lib/project/types.ts';
import { mediaIdentity } from '../media';
import {
  SUITE_FORMAT,
  SUITE_VERSION,
  type MediaAvailability,
  type MediaKind,
  type MediaOrigin,
  type SuiteDocument,
  type SuiteMediaRef,
} from '../types';

function refOf(media: MediaItem): SuiteMediaRef {
  const kind: MediaKind = media.kind === 'audio' || media.kind === 'image' ? media.kind : 'video';
  const origin: MediaOrigin = media.proxy ? 'proxy' : media.converted ? 'generated' : 'user-file';
  const availability: MediaAvailability =
    media.status === 'ready' ? 'ready' : media.status === 'missing' ? 'missing' : 'unknown';
  const fileName = media.fileName ?? media.name;
  return {
    id: media.id,
    name: media.name,
    fileName,
    kind,
    origin,
    availability,
    identity: mediaIdentity(fileName, media.fileSize, media.lastModified ?? null),
    reference: media.id,
    mimeType: media.mimeType,
    bytes: media.fileSize,
    duration: media.duration,
    lastModified: media.lastModified ?? null,
    relativePath: media.relativePath ?? null,
    meta: {
      width: media.width,
      height: media.height,
      fps: media.fps ?? 0,
      hasVideo: media.hasVideo,
      hasAudio: media.hasAudio,
      videoCodec: media.videoCodec,
      audioCodec: media.audioCodec,
      container: media.container,
      label: media.label,
      rotation: media.rotation,
      binId: media.binId,
    },
  };
}

export function projectToSuiteDocument(project: Project): SuiteDocument {
  return {
    format: SUITE_FORMAT,
    version: SUITE_VERSION,
    id: project.id,
    name: project.name,
    studio: 'video',
    createdAt: project.createdAt,
    modifiedAt: project.modifiedAt,
    media: project.media.map(refOf),
    // deep copy through the existing serializer: keeps the payload a plain,
    // versioned JSON record and drops any client-only references
    payload: JSON.parse(serializeProject(project)) as Record<string, unknown>,
  };
}

export function suiteDocumentToProject(doc: SuiteDocument): Project {
  // the payload is authoritative; revalidation uses the existing strict v1
  // parser, so malformed or tampered documents fail loudly
  return parseProject(JSON.stringify(doc.payload));
}

// Wrap an existing unmodified .braincut v1 file in a suite document.
export function legacyBraincutToSuiteDocument(text: string): SuiteDocument {
  return projectToSuiteDocument(parseProject(text));
}
