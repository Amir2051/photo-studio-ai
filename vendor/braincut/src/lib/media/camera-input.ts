/**
 * Shared browser camera-input policy for UVC webcams, capture cards, OBSBOT
 * devices exposed as standard video inputs, and mobile browser cameras.
 *
 * Network/IP cameras that expose RTSP/NDI/SRT are intentionally not handled
 * here; they require a separate ingest bridge or WebRTC adapter.
 */
export type CameraFacingMode = 'user' | 'environment';

export interface CameraInputOptions {
  deviceId?: string | null;
  facingMode?: CameraFacingMode | null;
  width?: number;
  height?: number;
  frameRate?: number;
  maxFrameRate?: number;
  audio?: boolean | MediaTrackConstraints;
}

function positive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Build a standards-based request without hard-required resolution constraints. */
export function buildCameraConstraints(options: CameraInputOptions = {}): MediaStreamConstraints {
  const width = positive(options.width, 1920);
  const height = positive(options.height, 1080);
  const frameRate = positive(options.frameRate, 30);
  const maxFrameRate = Math.max(frameRate, positive(options.maxFrameRate, 60));
  const deviceId = options.deviceId?.trim();

  const video: MediaTrackConstraints = {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: frameRate, max: maxFrameRate },
  };

  if (deviceId) {
    video.deviceId = { exact: deviceId };
  } else if (options.facingMode) {
    video.facingMode = { ideal: options.facingMode };
  }

  return {
    video,
    audio: options.audio ?? false,
  };
}

/** Stable, actionable browser error copy shared by both capture surfaces. */
export function cameraInputErrorMessage(error: unknown): string {
  const record = error !== null && typeof error === 'object'
    ? error as { name?: unknown; message?: unknown }
    : null;
  const name = typeof record?.name === 'string' ? record.name : '';
  const message = typeof record?.message === 'string' && record.message.trim()
    ? record.message
    : '';

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera or microphone permission was denied. Allow access for this editor and try again.';
    case 'NotFoundError':
      return 'No camera was found. Connect a webcam or capture card and refresh the device list.';
    case 'NotReadableError':
      return 'The camera is busy or unavailable. Close other apps using it and try again.';
    case 'OverconstrainedError':
      return 'The selected camera cannot meet the requested video settings. Try another camera or a lower resolution.';
    case 'AbortError':
      return 'Camera startup was interrupted. Reconnect the device and try again.';
    case 'NotSupportedError':
      return 'This browser does not support the requested camera capture mode.';
    default:
      return message || 'Could not connect to the camera.';
  }
}
