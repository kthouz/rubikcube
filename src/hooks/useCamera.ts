/**
 * Camera access lifecycle as a hook.
 *
 * Requests a webcam stream via getUserMedia (preferring the rear/environment
 * camera), wires it to a <video> element, and tracks the permission/error
 * state so the UI can respond gracefully — most importantly when the user
 * denies access. The stream is stopped on unmount and on retry.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus =
  | 'idle' // not yet started
  | 'requesting' // awaiting getUserMedia
  | 'ready' // stream live
  | 'denied' // user (or policy) blocked access
  | 'unsupported' // no getUserMedia / no camera
  | 'error'; // any other failure

export interface UseCamera {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  /** Human-readable detail for the current error/denied state, if any. */
  errorMessage: string | null;
  /** (Re)request the camera — used for the retry affordance. */
  start: () => void;
  /** Stop the stream and release the device. */
  stop: () => void;
}

function classifyError(err: unknown): { status: CameraStatus; message: string } {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        status: 'denied',
        message:
          'Camera access was blocked. Allow camera permission in your browser, then try again.',
      };
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        status: 'unsupported',
        message: 'No camera was found on this device.',
      };
    case 'NotReadableError':
      return {
        status: 'error',
        message: 'The camera is already in use by another app. Close it and try again.',
      };
    default:
      return {
        status: 'error',
        message:
          err instanceof Error ? err.message : 'Could not start the camera. Please try again.',
      };
  }
}

export function useCamera(): UseCamera {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumping this re-runs the effect below, re-requesting the camera.
  const [attempt, setAttempt] = useState(0);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(() => {
    setStatus('requesting');
    setErrorMessage(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    // `attempt === 0` is the idle state before the first start() call.
    if (attempt === 0) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setErrorMessage('This browser does not support camera access.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          // Some browsers need an explicit play() after setting srcObject.
          await video.play().catch(() => undefined);
        }
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const { status: s, message } = classifyError(err);
        setStatus(s);
        setErrorMessage(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Release the device when the component using this hook unmounts.
  useEffect(() => stop, [stop]);

  return { videoRef, status, errorMessage, start, stop };
}
