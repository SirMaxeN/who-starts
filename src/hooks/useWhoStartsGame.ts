import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { RoundMode, SurfaceSize, TouchPoint } from '../types/game';
import { RoundModeStorage } from '../services/RoundModeStorage';
import { getTouchSignature, pickWinner } from '../utils/game';

const DEFAULT_MODE: RoundMode = 3000;

export function useWhoStartsGame() {
  const [roundMode, setRoundMode] = useState<RoundMode>(DEFAULT_MODE);
  const [activeTouches, setActiveTouches] = useState<TouchPoint[]>([]);
  const [winner, setWinner] = useState<TouchPoint | null>(null);
  const [awaitingRelease, setAwaitingRelease] = useState(false);
  const [countdownDeadline, setCountdownDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [surfaceSize, setSurfaceSize] = useState<SurfaceSize>({ width: 0, height: 0 });
  const hasLoadedSettings = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMode() {
      const savedMode = await RoundModeStorage.load(DEFAULT_MODE);

      if (isMounted) {
        setRoundMode(savedMode);
        hasLoadedSettings.current = true;
      }
    }

    loadMode();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings.current) {
      return;
    }

    RoundModeStorage.save(roundMode);
  }, [roundMode]);

  const touchSignature = getTouchSignature(activeTouches);

  useEffect(() => {
    if (winner || awaitingRelease) {
      setCountdownDeadline(null);
      setRemainingMs(null);
      return;
    }

    if (roundMode === 'manual' || activeTouches.length < 2) {
      setCountdownDeadline(null);
      setRemainingMs(null);
      return;
    }

    const deadline = Date.now() + roundMode;
    setCountdownDeadline(deadline);
    setRemainingMs(roundMode);
  }, [activeTouches.length, awaitingRelease, roundMode, touchSignature, winner]);

  useEffect(() => {
    if (countdownDeadline === null) {
      return;
    }

    const updateRemaining = () => {
      setRemainingMs(Math.max(0, countdownDeadline - Date.now()));
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 50);

    return () => clearInterval(timer);
  }, [countdownDeadline]);

  useEffect(() => {
    if (!awaitingRelease || activeTouches.length !== 0) {
      return;
    }

    setWinner(null);
    setAwaitingRelease(false);
  }, [activeTouches.length, awaitingRelease]);

  function selectWinner(sourceTouches: TouchPoint[]) {
    if (sourceTouches.length < 2 || winner || awaitingRelease) {
      return;
    }

    const nextWinner = pickWinner(sourceTouches);
    if (!nextWinner) {
      return;
    }

    setWinner(nextWinner);
    setAwaitingRelease(true);
    setCountdownDeadline(null);
    setRemainingMs(null);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {
        // Ignore haptics issues on unsupported devices.
      }
    );
  }

  useEffect(() => {
    if (
      roundMode !== 'manual' &&
      remainingMs !== null &&
      remainingMs <= 0 &&
      activeTouches.length >= 2 &&
      !winner &&
      !awaitingRelease
    ) {
      selectWinner(activeTouches);
    }
  }, [activeTouches, awaitingRelease, remainingMs, roundMode, winner]);

  function handleSurfaceLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSurfaceSize({ width, height });
  }

  return {
    activeTouches,
    awaitingRelease,
    handleSurfaceLayout,
    isHelpOpen,
    isSettingsOpen,
    openHelp: () => setIsHelpOpen(true),
    openSettings: () => setIsSettingsOpen(true),
    closeHelp: () => setIsHelpOpen(false),
    closeSettings: () => setIsSettingsOpen(false),
    remainingMs,
    roundMode,
    selectWinner,
    setActiveTouches,
    setRoundMode,
    surfaceSize,
    visibleTouches: winner ? [winner] : activeTouches,
    winner,
  };
}
