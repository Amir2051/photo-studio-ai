import { describe, expect, it } from 'vitest';
import { buildCameraConstraints, cameraInputErrorMessage } from './camera-input';

describe('buildCameraConstraints', () => {
  it('uses ideal HD defaults and leaves unsupported audio disabled by default', () => {
    expect(buildCameraConstraints()).toEqual({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    });
  });

  it('pins a selected UVC/capture-card device without making resolution mandatory', () => {
    const constraints = buildCameraConstraints({
      deviceId: '  camera-1  ',
      width: 1280,
      height: 720,
      frameRate: 25,
      maxFrameRate: 30,
      audio: true,
    });
    expect(constraints.video).toMatchObject({
      deviceId: { exact: 'camera-1' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 25, max: 30 },
    });
    expect(constraints.audio).toBe(true);
  });

  it('supports mobile front/rear camera preference when no device is selected', () => {
    expect(buildCameraConstraints({ facingMode: 'environment' }).video).toMatchObject({
      facingMode: { ideal: 'environment' },
    });
    expect(buildCameraConstraints({ facingMode: 'user', deviceId: 'camera-2' }).video)
      .toMatchObject({ deviceId: { exact: 'camera-2' } });
  });

  it('sanitizes invalid numeric settings and keeps max frame rate above the ideal', () => {
    expect(buildCameraConstraints({
      width: Number.NaN,
      height: -1,
      frameRate: 60,
      maxFrameRate: 24,
    }).video).toMatchObject({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 60, max: 60 },
    });
  });
});

describe('cameraInputErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'permission was denied'],
    ['NotFoundError', 'No camera was found'],
    ['NotReadableError', 'camera is busy'],
    ['OverconstrainedError', 'cannot meet the requested video settings'],
    ['AbortError', 'startup was interrupted'],
    ['NotSupportedError', 'does not support the requested camera capture mode'],
  ])('maps %s to actionable guidance', (name, expected) => {
    expect(cameraInputErrorMessage({ name })).toContain(expected);
  });

  it('preserves a useful unknown error message', () => {
    expect(cameraInputErrorMessage(new Error('Device driver failed'))).toBe('Device driver failed');
  });

  it('does not leak arbitrary non-error values', () => {
    expect(cameraInputErrorMessage({ code: 7 })).toBe('Could not connect to the camera.');
  });
});
