export const RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/webm',
  'audio/ogg'
] as const;

export function supportedRecordingMimeType(isSupported: (type: string) => boolean): string {
  return RECORDING_MIME_TYPES.find(isSupported) ?? '';
}

export function recordingFile(blob: Blob, mimeType: string, now = new Date(), prefix = 'voice-recording'): File {
  const type = mimeType || blob.type || 'audio/webm';
  const extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return new File([blob], `${prefix}-${stamp}.${extension}`, { type });
}
