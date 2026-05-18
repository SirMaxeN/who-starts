import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
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
  const baseRetryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const fadeTimersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const transitionIdRef = useRef(0);
  const isInteractionUnlockedRef = useRef(Platform.OS !== 'web');
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    hasTouchesRef.current = hasTouches;
    selectionStateRef.current = selectionState;

    if (selectionState === 'post') {
      selectingCycleKindRef.current = 'post';
    }
  }, [hasTouches, selectionState]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const unlockAudio = () => {
      if (isInteractionUnlockedRef.current) {
        if (
          enabled &&
          selectionStateRef.current === 'idle' &&
          !isPlayerRunning(basePlayer) &&
          !isPlayerRunning(selectingPlayer)
        ) {
          startBaseImmediately();
        }

        return;
      }

      isInteractionUnlockedRef.current = true;

      if (!enabled) {
        return;
      }

      if (isPlayerRunning(basePlayer) || isPlayerRunning(selectingPlayer)) {
        return;
      }

      if (selectionStateRef.current === 'idle') {
        startBaseImmediately();
        return;
      }

      void transitionToSelecting();
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('mousedown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
    };
  }, [basePlayer, enabled, selectingPlayer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasActive = appStateRef.current === 'active';
      const isActive = nextAppState === 'active';
      appStateRef.current = nextAppState;

      if (wasActive && !isActive) {
        clearBaseRetryTimers();
        clearFadeTimers();
        basePlayer.pause();
        selectingPlayer.pause();
        return;
      }

      if (!wasActive && isActive && enabled) {
        if (Platform.OS === 'web' && !isInteractionUnlockedRef.current) {
          return;
        }

        if (selectionStateRef.current === 'idle') {
          void transitionToBase();
          return;
        }

        void transitionToSelecting();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [basePlayer, enabled, selectingPlayer]);

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
      clearBaseRetryTimers();
      clearFadeTimers();
      basePlayer.pause();
      selectingPlayer.pause();
      basePlayer.remove();
      selectingPlayer.remove();
    };
  }, [basePlayer, selectingPlayer]);

  useEffect(() => {
    if (!enabled) {
      clearBaseRetryTimers();
      clearFadeTimers();
      phaseRef.current = 'silent';
      selectingStartedAtRef.current = null;
      basePlayer.pause();
      selectingPlayer.pause();
      basePlayer.volume = 0;
      selectingPlayer.volume = 0;
      return;
    }

    if (appStateRef.current !== 'active') {
      return;
    }

    if (Platform.OS === 'web' && !isInteractionUnlockedRef.current) {
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
      appStateRef.current !== 'active' ||
      (Platform.OS === 'web' && !isInteractionUnlockedRef.current) ||
      phaseRef.current === 'selecting' ||
      phaseRef.current === 'fadingToSelecting'
    ) {
      return;
    }

    clearFadeTimers();
    clearBaseRetryTimers();
    phaseRef.current = 'fadingToSelecting';
    selectingStartedAtRef.current = Date.now();
    selectingCycleKindRef.current =
      selectionStateRef.current === 'post' ? 'post' : 'pre';
    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;

    await selectingPlayer.seekTo(0).catch(() => {
      // Ignore seek failures and continue best-effort playback.
    });

    playIfStopped(basePlayer);
    playIfStopped(selectingPlayer);

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
      appStateRef.current !== 'active' ||
      (Platform.OS === 'web' && !isInteractionUnlockedRef.current) ||
      (phaseRef.current === 'base' && isPlayerRunning(basePlayer)) ||
      phaseRef.current === 'fadingToBase'
    ) {
      return;
    }

    clearFadeTimers();
    clearBaseRetryTimers();
    phaseRef.current = 'fadingToBase';
    selectingStartedAtRef.current = null;
    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;

    playIfStopped(basePlayer);

    basePlayer.loop = true;
    scheduleBaseRetryStarts();
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

  function startBaseImmediately() {
    clearBaseRetryTimers();
    clearFadeTimers();
    isInteractionUnlockedRef.current = true;
    basePlayer.loop = true;
    basePlayer.volume = BASE_VOLUME;
    selectingPlayer.pause();
    selectingPlayer.volume = 0;
    phaseRef.current = 'fadingToBase';
    playIfStopped(basePlayer);
    markBasePhaseIfRunning();
    scheduleBaseRetryStarts();
  }

  function scheduleBaseRetryStarts() {
    if (Platform.OS !== 'web') {
      return;
    }

    for (const delay of [80, 160, 420, 900, 1600, 2600]) {
      const timer = setTimeout(() => {
        baseRetryTimersRef.current = baseRetryTimersRef.current.filter(
          (currentTimer) => currentTimer !== timer
        );

        if (markBasePhaseIfRunning()) {
          return;
        }

        if (
          !enabled ||
          appStateRef.current !== 'active' ||
          (phaseRef.current !== 'fadingToBase' && selectionStateRef.current !== 'idle') ||
          phaseRef.current === 'selecting' ||
          phaseRef.current === 'fadingToSelecting' ||
          isPlayerRunning(basePlayer)
        ) {
          return;
        }

        basePlayer.loop = true;
        basePlayer.volume = BASE_VOLUME;
        playIfStopped(basePlayer);
        markBasePhaseIfRunning();
      }, delay);

      baseRetryTimersRef.current.push(timer);
    }
  }

  function clearBaseRetryTimers() {
    for (const timer of baseRetryTimersRef.current) {
      clearTimeout(timer);
    }

    baseRetryTimersRef.current = [];
  }

  function ensureBaseOnInteraction() {
    if (
      !enabled ||
      Platform.OS !== 'web' ||
      selectionStateRef.current !== 'idle' ||
      isPlayerRunning(basePlayer) ||
      isPlayerRunning(selectingPlayer)
    ) {
      return;
    }

    startBaseImmediately();
  }

  function isPlayerRunning(player: typeof basePlayer) {
    if (Platform.OS !== 'web') {
      return player.playing;
    }

    return player.currentStatus.playing || !player.paused;
  }

  function playIfStopped(player: typeof basePlayer) {
    if (!isPlayerRunning(player)) {
      player.play();
    }
  }

  function markBasePhaseIfRunning() {
    if (!isPlayerRunning(basePlayer)) {
      return false;
    }

    if (phaseRef.current === 'fadingToBase' || phaseRef.current === 'silent') {
      phaseRef.current = 'base';
    }

    return true;
  }

  return {
    ensureBaseOnInteraction,
  };
}
