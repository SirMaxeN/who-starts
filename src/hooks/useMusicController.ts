import { useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const BASE_TRACK = require('../../assets/sounds/base.mp3');
const SELECTING_TRACK = require('../../assets/sounds/selecting.mp3');

const BASE_VOLUME = 0.44;
const SELECTING_VOLUME = 0.62;
const FADE_TO_SELECTING_BASE_OUT_MS = 550;
const FADE_TO_SELECTING_SELECTING_IN_MS = 900;
const FADE_TO_BASE_BASE_IN_MS = 100;
const FADE_TO_BASE_SELECTING_OUT_MS = 1_000;
const FADE_STEP_MS = 50;
const MIN_POST_SELECTION_MS = 5_000;
const SELECTING_SONG_END_BUFFER_MS = 10_000;

type UseMusicControllerParams = {
  enabled: boolean;
  hasTouches: boolean;
  selectionState: 'idle' | 'post' | 'pre';
};

type Phase = 'base' | 'selecting' | 'fadingToBase' | 'fadingToSelecting' | 'silent';

export function useMusicController({
  enabled,
  hasTouches,
  selectionState,
}: UseMusicControllerParams) {
  const [basePlayer] = useState(() => createAudioPlayer(BASE_TRACK, { updateInterval: 250 }));
  const [selectingPlayer] = useState(() =>
    createAudioPlayer(SELECTING_TRACK, { updateInterval: 250 })
  );

  const phaseRef = useRef<Phase>('silent');
  const hasTouchesRef = useRef(hasTouches);
  const selectionStateRef = useRef(selectionState);
  const selectingCycleKindRef = useRef<'post' | 'pre'>('pre');
  const selectingStartedAtRef = useRef<number | null>(null);
  const fadeTimersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const transitionIdRef = useRef(0);

  useEffect(() => {
    hasTouchesRef.current = hasTouches;
    selectionStateRef.current = selectionState;

    if (selectionState === 'post') {
      selectingCycleKindRef.current = 'post';
    }
  }, [hasTouches, selectionState]);

  useEffect(() => {
    basePlayer.loop = true;
    basePlayer.volume = 0;
    selectingPlayer.loop = false;
    selectingPlayer.volume = 0;

    setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {
      // Ignore audio mode errors and keep the app usable.
    });

    return () => {
      clearFadeTimers();
      basePlayer.pause();
      selectingPlayer.pause();
      basePlayer.remove();
      selectingPlayer.remove();
    };
  }, [basePlayer, selectingPlayer]);

  useEffect(() => {
    if (!enabled) {
      clearFadeTimers();
      phaseRef.current = 'silent';
      selectingStartedAtRef.current = null;
      basePlayer.pause();
      selectingPlayer.pause();
      basePlayer.volume = 0;
      selectingPlayer.volume = 0;
      return;
    }

    basePlayer.loop = true;

    if (
      selectionState === 'idle' &&
      phaseRef.current !== 'fadingToBase'
    ) {
      void transitionToBase();
      return;
    }

    if (
      selectionState !== 'idle' &&
      phaseRef.current !== 'selecting' &&
      phaseRef.current !== 'fadingToSelecting'
    ) {
      void transitionToSelecting();
    }
  }, [basePlayer, enabled, selectingPlayer, selectionState]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const monitor = setInterval(() => {
      if (phaseRef.current !== 'selecting') {
        return;
      }

      const startedAt = selectingStartedAtRef.current;
      if (!startedAt) {
        return;
      }

      const elapsedMs = Date.now() - startedAt;
      const durationMs = (selectingPlayer.duration ?? 0) * 1000;
      const currentTimeMs = (selectingPlayer.currentTime ?? 0) * 1000;
      const isNearSongEnd =
        durationMs > 0 && durationMs - currentTimeMs <= SELECTING_SONG_END_BUFFER_MS;

      if (
        selectingCycleKindRef.current === 'pre' &&
        selectionStateRef.current === 'idle'
      ) {
        void transitionToBase();
        return;
      }

      if (selectingCycleKindRef.current === 'post') {
        if (!hasTouchesRef.current && elapsedMs >= MIN_POST_SELECTION_MS) {
          void transitionToBase();
          return;
        }

        if (hasTouchesRef.current && isNearSongEnd) {
          void transitionToBase();
        }
      }
    }, 200);

    return () => {
      clearInterval(monitor);
    };
  }, [enabled, selectingPlayer]);

  async function transitionToSelecting() {
    if (
      !enabled ||
      phaseRef.current === 'selecting' ||
      phaseRef.current === 'fadingToSelecting'
    ) {
      return;
    }

    clearFadeTimers();
    phaseRef.current = 'fadingToSelecting';
    selectingStartedAtRef.current = Date.now();
    selectingCycleKindRef.current =
      selectionStateRef.current === 'post' ? 'post' : 'pre';
    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;

    await selectingPlayer.seekTo(0).catch(() => {
      // Ignore seek failures and continue best-effort playback.
    });

    if (!basePlayer.playing) {
      basePlayer.play();
    }
    if (!selectingPlayer.playing) {
      selectingPlayer.play();
    }

    fadeVolume(basePlayer, 0, FADE_TO_SELECTING_BASE_OUT_MS);
    fadeVolume(
      selectingPlayer,
      SELECTING_VOLUME,
      FADE_TO_SELECTING_SELECTING_IN_MS,
      () => {
        if (transitionIdRef.current === transitionId) {
          phaseRef.current = 'selecting';
        }
      }
    );
  }

  async function transitionToBase() {
    if (
      !enabled ||
      phaseRef.current === 'base' ||
      phaseRef.current === 'fadingToBase'
    ) {
      return;
    }

    clearFadeTimers();
    phaseRef.current = 'fadingToBase';
    selectingStartedAtRef.current = null;
    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;

    if (!basePlayer.playing) {
      basePlayer.play();
    }

    basePlayer.loop = true;
    fadeVolume(basePlayer, BASE_VOLUME, FADE_TO_BASE_BASE_IN_MS);
    fadeVolume(selectingPlayer, 0, FADE_TO_BASE_SELECTING_OUT_MS, () => {
      if (transitionIdRef.current !== transitionId) {
        return;
      }

      selectingPlayer.pause();
      void selectingPlayer.seekTo(0).catch(() => {
        // Ignore seek failures and keep the app usable.
      });
      phaseRef.current = 'base';
    });
  }

  function fadeVolume(
    player: { volume: number },
    targetVolume: number,
    durationMs: number,
    onComplete?: () => void
  ) {
    const startVolume = player.volume;

    if (Math.abs(startVolume - targetVolume) < 0.01) {
      player.volume = targetVolume;
      onComplete?.();
      return;
    }

    const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(1, currentStep / steps);
      player.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress >= 1) {
        clearInterval(timer);
        fadeTimersRef.current = fadeTimersRef.current.filter(
          (existingTimer) => existingTimer !== timer
        );
        onComplete?.();
      }
    }, FADE_STEP_MS);

    fadeTimersRef.current.push(timer);
  }

  function clearFadeTimers() {
    for (const timer of fadeTimersRef.current) {
      clearInterval(timer);
    }

    fadeTimersRef.current = [];
  }
}
