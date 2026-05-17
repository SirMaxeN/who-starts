import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from 'react-native';
import type { RoundMode, SurfaceSize, TouchPoint } from '../types/game';
import { RoundModeStorage } from '../services/RoundModeStorage';
import { getTouchSignature, pickWinner } from '../utils/game';
import {
  isInsideCenterZone,
  mapChangedTouchIds,
  mapTouches,
} from '../utils/touches';

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
  const [playerLabels, setPlayerLabels] = useState<Record<string, string>>({});
  const hasLoadedSettings = useRef(false);
  const nextPlayerNumber = useRef(1);
  const ignoredTouchIds = useRef<Set<string>>(new Set());

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
    setPlayerLabels((currentLabels) => {
      if (activeTouches.length === 0) {
        nextPlayerNumber.current = 1;
        return {};
      }

      const nextLabels = { ...currentLabels };
      let hasChanges = false;

      for (const touch of activeTouches) {
        if (!nextLabels[touch.id]) {
          nextLabels[touch.id] = `Player ${nextPlayerNumber.current}`;
          nextPlayerNumber.current += 1;
          hasChanges = true;
        }
      }

      return hasChanges ? nextLabels : currentLabels;
    });
  }, [activeTouches]);

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

  function handleTouchEvent(event: NativeSyntheticEvent<NativeTouchEvent>) {
    handleTouchEventInternal(event, false);
  }

  function handleTouchStartEvent(event: NativeSyntheticEvent<NativeTouchEvent>) {
    handleTouchEventInternal(event, true);
  }

  function handleTouchEventInternal(
    event: NativeSyntheticEvent<NativeTouchEvent>,
    isTouchStart: boolean
  ) {
    const nextTouches = mapTouches(event);
    const currentIds = new Set(nextTouches.map((touch) => touch.id));
    const changedTouches = mapChangedTouchIds(event);
    const knownIds = new Set([
      ...activeTouches.map((touch) => touch.id),
      ...ignoredTouchIds.current,
    ]);

    for (const touch of changedTouches) {
      const isNewTouch = !knownIds.has(touch.id);
      const isCenterTouch =
        surfaceSize.width > 0 &&
        surfaceSize.height > 0 &&
        isInsideCenterZone(touch.x, touch.y, surfaceSize);

      if (
        isTouchStart &&
        isNewTouch &&
        isCenterTouch &&
        roundMode === 'manual' &&
        activeTouches.length >= 2 &&
        !winner &&
        !awaitingRelease
      ) {
        selectWinner(activeTouches);
      }

      if (
        isNewTouch &&
        isCenterTouch
      ) {
        ignoredTouchIds.current.add(touch.id);
      }
    }

    for (const ignoredId of Array.from(ignoredTouchIds.current)) {
      if (!currentIds.has(ignoredId)) {
        ignoredTouchIds.current.delete(ignoredId);
      }
    }

    setActiveTouches(
      nextTouches.filter((touch) => !ignoredTouchIds.current.has(touch.id))
    );
  }

  return {
    activeTouches,
    awaitingRelease,
    handleTouchEvent,
    handleTouchStartEvent,
    handleSurfaceLayout,
    isHelpOpen,
    isSettingsOpen,
    playerLabels,
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
