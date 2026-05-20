import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from 'react-native';
import { AppState, Platform } from 'react-native';
import type {
  AppScreen,
  AppSettings,
  RoundMode,
  SurfaceSize,
  TouchPoint,
} from '../types/game';
import { DEFAULT_SETTINGS } from '../constants/game';
import { useMusicController } from './useMusicController';
import { useSoundEffectsController } from './useSoundEffectsController';
import { AppSettingsStorage } from '../services/AppSettingsStorage';
import { RoundModeStorage } from '../services/RoundModeStorage';
import { areTouchesEqual, getTouchSignature, pickWinner } from '../utils/game';
import {
  isInsideCenterZone,
  isInsideTopControlZone,
  mapChangedTouchIds,
  mapTouches,
} from '../utils/touches';

const DEFAULT_MODE: RoundMode = 2000;
const WEB_TOUCH_RECONCILE_INTERVAL_MS = 1000;
const AWAITING_RELEASE_STALE_RESET_MS = 2000;
const WEB_DEV_TOUCH_KEYS = new Set(['1', '2', '3', '4', '5', '6']);
const WEB_DEV_RESET_TOUCH_KEY = '0';

type UseWhoStartsGameParams = {
  screen: AppScreen;
};

export function useWhoStartsGame({ screen }: UseWhoStartsGameParams) {
  const [roundMode, setRoundMode] = useState<RoundMode>(DEFAULT_MODE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTouches, setActiveTouches] = useState<TouchPoint[]>([]);
  const [winner, setWinner] = useState<TouchPoint | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<TouchPoint[] | null>(null);
  const [winnerBurstKey, setWinnerBurstKey] = useState(0);
  const [awaitingRelease, setAwaitingRelease] = useState(false);
  const [countdownDeadline, setCountdownDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isRoundModeOpen, setIsRoundModeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [surfaceSize, setSurfaceSize] = useState<SurfaceSize>({ width: 0, height: 0 });
  const [playerLabels, setPlayerLabels] = useState<Record<string, string>>({});
  const hasLoadedSettings = useRef(false);
  const nextPlayerNumber = useRef(1);
  const ignoredTouchIds = useRef<Set<string>>(new Set());
  const activeTouchesRef = useRef<TouchPoint[]>([]);
  const pendingTouchesRef = useRef<TouchPoint[] | null>(null);
  const touchFrameRef = useRef<number | null>(null);
  const latestWebTouchesRef = useRef<TouchPoint[] | null>(null);
  const webDevTouchKeyRef = useRef<string | null>(null);
  const webDevPressedKeysRef = useRef<string[]>([]);
  const webDevTouchesRef = useRef<TouchPoint[]>([]);
  const lastTouchEventAtRef = useRef(Date.now());
  const isOrderScreen = screen === 'players-order';
  const selectionState =
    winner !== null || selectedOrder !== null || awaitingRelease
      ? 'post'
      : activeTouches.length >= 2
        ? 'pre'
        : 'idle';

  const musicController = useMusicController({
    enabled: settings.music,
    hasTouches: activeTouches.length > 0,
    selectionState,
  });
  const soundEffects = useSoundEffectsController({
    countdownActive:
      roundMode !== 'manual' &&
      activeTouches.length >= 2 &&
      remainingMs !== null &&
      !winner &&
      !selectedOrder &&
      !awaitingRelease,
    enabled: settings.sounds,
    playerCount: activeTouches.length,
    remainingMs,
    roundMode,
    winnerId: winner?.id ?? null,
  });

  function runHaptic(effect: () => Promise<void>) {
    if (!settings.haptics || Platform.OS === 'web') {
      return;
    }

    effect().catch(() => {
      // Ignore haptics issues on unsupported devices.
    });
  }

  function playTapHaptic() {
    runHaptic(() => Haptics.selectionAsync());
  }

  function playLightHaptic() {
    runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }

  function playStartHaptic() {
    runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }

  function playSuccessHaptic() {
    runHaptic(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    );
  }

  useEffect(() => {
    activeTouchesRef.current = activeTouches;
  }, [activeTouches]);

  useEffect(() => {
    if (!awaitingRelease || activeTouches.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() - lastTouchEventAtRef.current < AWAITING_RELEASE_STALE_RESET_MS) {
        return;
      }

      ignoredTouchIds.current.clear();
      latestWebTouchesRef.current = [];
      webDevTouchesRef.current = [];
      queueActiveTouches([]);
    }, 250);

    return () => clearInterval(timer);
  }, [activeTouches.length, awaitingRelease]);

  useEffect(() => {
    return () => {
      if (touchFrameRef.current !== null) {
        cancelAnimationFrame(touchFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleAppBlur = () => {
      ignoredTouchIds.current.clear();
      latestWebTouchesRef.current = [];
      webDevTouchesRef.current = [];
      queueActiveTouches([]);
    };

    const changeSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        handleAppBlur();
      }
    });
    const blurSubscription =
      Platform.OS === 'android' ? AppState.addEventListener('blur', handleAppBlur) : null;

    return () => {
      changeSubscription.remove();
      blurSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const mapWebTouches = (touchList: TouchList | null | undefined) =>
      Array.from(touchList ?? [])
        .map((touch) => ({
          id: String(touch.identifier),
          x: touch.pageX,
          y: touch.pageY,
        }))
        .sort((left, right) => left.id.localeCompare(right.id));

    const updateWebTouches = (touches: TouchPoint[]) => {
      if (webDevTouchesRef.current.length > 0) {
        return;
      }

      latestWebTouchesRef.current = touches;
    };

    const handleWindowTouch = (event: TouchEvent) => {
      if (webDevTouchesRef.current.length > 0) {
        event.preventDefault();
        return;
      }

      updateWebTouches(mapWebTouches(event.touches));
    };

    const clearWebTouches = () => {
      if (__DEV__ && webDevTouchesRef.current.length > 0) {
        return;
      }

      webDevTouchesRef.current = [];
      updateWebTouches([]);
      ignoredTouchIds.current.clear();
      queueActiveTouches([]);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearWebTouches();
      }
    };

    window.addEventListener('touchstart', handleWindowTouch, { passive: false });
    window.addEventListener('touchmove', handleWindowTouch, { passive: false });
    window.addEventListener('touchend', handleWindowTouch, { passive: false });
    window.addEventListener('touchcancel', handleWindowTouch, { passive: false });
    window.addEventListener('blur', clearWebTouches);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const reconcileTimer = window.setInterval(() => {
      const webTouches = latestWebTouchesRef.current;

      if (webDevTouchesRef.current.length > 0) {
        return;
      }

      if (webTouches === null) {
        return;
      }

      const currentIds = new Set(webTouches.map((touch) => touch.id));

      for (const ignoredId of Array.from(ignoredTouchIds.current)) {
        if (!currentIds.has(ignoredId)) {
          ignoredTouchIds.current.delete(ignoredId);
        }
      }

      const filteredTouches = webTouches.filter(
        (touch) => !ignoredTouchIds.current.has(touch.id)
      );

      if (!areTouchesEqual(activeTouchesRef.current, filteredTouches)) {
        queueActiveTouches(filteredTouches);
      }
    }, WEB_TOUCH_RECONCILE_INTERVAL_MS);

    return () => {
      window.removeEventListener('touchstart', handleWindowTouch);
      window.removeEventListener('touchmove', handleWindowTouch);
      window.removeEventListener('touchend', handleWindowTouch);
      window.removeEventListener('touchcancel', handleWindowTouch);
      window.removeEventListener('blur', clearWebTouches);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(reconcileTimer);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !__DEV__ || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === WEB_DEV_RESET_TOUCH_KEY) {
        event.preventDefault();
        resetTouchRound();
        return;
      }

      if (WEB_DEV_TOUCH_KEYS.has(event.key)) {
        event.preventDefault();
        webDevPressedKeysRef.current = [
          ...webDevPressedKeysRef.current.filter((key) => key !== event.key),
          event.key,
        ];
        webDevTouchKeyRef.current = event.key;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!WEB_DEV_TOUCH_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      webDevPressedKeysRef.current = webDevPressedKeysRef.current.filter(
        (key) => key !== event.key
      );
      webDevTouchKeyRef.current =
        webDevPressedKeysRef.current[webDevPressedKeysRef.current.length - 1] ?? null;
    };

    const clearDevKey = () => {
      webDevPressedKeysRef.current = [];
      webDevTouchKeyRef.current = null;
    };

    const handleMouseDown = (event: MouseEvent) => {
      const devKey =
        webDevPressedKeysRef.current[webDevPressedKeysRef.current.length - 1] ??
        webDevTouchKeyRef.current;

      if (!devKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      addWebDevTouch(devKey, event.pageX, event.pageY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const devKey =
        webDevPressedKeysRef.current[webDevPressedKeysRef.current.length - 1] ??
        webDevTouchKeyRef.current;

      if (!devKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      addWebDevTouch(devKey, event.pageX, event.pageY);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const devKey =
        webDevPressedKeysRef.current[webDevPressedKeysRef.current.length - 1] ??
        webDevTouchKeyRef.current;
      const touch = event.changedTouches[0];

      if (!devKey || !touch) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      addWebDevTouch(devKey, touch.pageX, touch.pageY);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('touchstart', handleTouchStart, {
      capture: true,
      passive: false,
    });
    window.addEventListener('blur', clearDevKey);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('touchstart', handleTouchStart, true);
      window.removeEventListener('blur', clearDevKey);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const [savedMode, savedSettings] = await Promise.all([
        RoundModeStorage.load(DEFAULT_MODE),
        AppSettingsStorage.load(),
      ]);

      if (isMounted) {
        setRoundMode(savedMode);
        setSettings(savedSettings);
        hasLoadedSettings.current = true;
      }
    }

    loadSettings();

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

  useEffect(() => {
    if (!hasLoadedSettings.current) {
      return;
    }

    AppSettingsStorage.save(settings);
  }, [settings]);

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
    playStartHaptic();
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
        if (selectedOrder || winner) {
          return currentLabels;
        }

        nextPlayerNumber.current = 1;
        return Object.keys(currentLabels).length === 0 ? currentLabels : {};
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
  }, [activeTouches, selectedOrder, winner]);

  useEffect(() => {
    if (!awaitingRelease || activeTouches.length !== 0) {
      return;
    }

    if ((isOrderScreen && selectedOrder) || winner) {
      return;
    }

    setWinner(null);
    setSelectedOrder(null);
    setAwaitingRelease(false);
  }, [activeTouches.length, awaitingRelease, isOrderScreen, selectedOrder, winner]);

  useEffect(() => {
    ignoredTouchIds.current.clear();
    latestWebTouchesRef.current = [];
    webDevTouchesRef.current = [];
    setWinner(null);
    setSelectedOrder(null);
    setAwaitingRelease(false);
    setCountdownDeadline(null);
    setRemainingMs(null);
    queueActiveTouches([]);
  }, [screen]);

  function completeRound(sourceTouches: TouchPoint[]) {
    if (sourceTouches.length < 2 || winner || selectedOrder || awaitingRelease) {
      return;
    }

    if (isOrderScreen) {
      const nextOrder = [...sourceTouches]
        .map((touch) => ({ touch, weight: Math.random() }))
        .sort((left, right) => left.weight - right.weight)
        .map((entry) => entry.touch);

      if (nextOrder.length < 2) {
        return;
      }

      setSelectedOrder(nextOrder);
    } else {
      const nextWinner = pickWinner(sourceTouches);
      if (!nextWinner) {
        return;
      }

      setWinner(nextWinner);
    }

    setWinnerBurstKey((current) => current + 1);
    setAwaitingRelease(true);
    setCountdownDeadline(null);
    setRemainingMs(null);

    playSuccessHaptic();
  }

  useEffect(() => {
    if (
      roundMode !== 'manual' &&
      remainingMs !== null &&
      remainingMs <= 0 &&
      activeTouches.length >= 2 &&
      !winner &&
      !selectedOrder &&
      !awaitingRelease
    ) {
      completeRound(activeTouches);
    }
  }, [activeTouches, awaitingRelease, remainingMs, roundMode, selectedOrder, winner]);

  function handleSurfaceLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSurfaceSize((currentSize) =>
      currentSize.width === width && currentSize.height === height
        ? currentSize
        : { width, height }
    );
  }

  function resetTouchRound() {
    ignoredTouchIds.current.clear();
    latestWebTouchesRef.current = [];
    webDevTouchesRef.current = [];
    setWinner(null);
    setSelectedOrder(null);
    setAwaitingRelease(false);
    setCountdownDeadline(null);
    setRemainingMs(null);
    queueActiveTouches([]);
  }

  function addWebDevTouch(devKey: string, x: number, y: number) {
    const nextTouch = {
      id: `dev-${devKey}`,
      x,
      y,
    };
    const nextTouches = [
      ...webDevTouchesRef.current.filter((touch) => touch.id !== nextTouch.id),
      nextTouch,
    ].sort((left, right) => left.id.localeCompare(right.id));

    if (awaitingRelease && activeTouchesRef.current.length === 0 && (winner || selectedOrder)) {
      setWinner(null);
      setSelectedOrder(null);
      setAwaitingRelease(false);
      setWinnerBurstKey((current) => current + 1);
    }

    ignoredTouchIds.current.clear();
    webDevTouchesRef.current = nextTouches;
    latestWebTouchesRef.current = nextTouches;
    lastTouchEventAtRef.current = Date.now();
    musicController.ensureBaseOnInteraction();
    soundEffects.playPress();
    queueActiveTouches(nextTouches);
  }

  function handleWebDevMouseDown(event: any) {
    if (Platform.OS !== 'web' || !__DEV__) {
      return;
    }

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const devKey =
      webDevPressedKeysRef.current[webDevPressedKeysRef.current.length - 1] ??
      webDevTouchKeyRef.current;

    if (!devKey) {
      return;
    }

    const nativeEvent = event?.nativeEvent ?? event;
    addWebDevTouch(devKey, Number(nativeEvent?.pageX ?? 0), Number(nativeEvent?.pageY ?? 0));
  }

  function handleTouchEvent(event: NativeSyntheticEvent<NativeTouchEvent>) {
    if (shouldIgnoreWebDevTouchEvent()) {
      return;
    }

    handleTouchEventInternal(event, false, false);
  }

  function handleTouchStartEvent(event: NativeSyntheticEvent<NativeTouchEvent>) {
    if (shouldIgnoreWebDevTouchEvent()) {
      return;
    }

    const shouldResetHeldResult =
      awaitingRelease &&
      activeTouchesRef.current.length === 0 &&
      (winner !== null || (isOrderScreen && selectedOrder !== null));

    if (shouldResetHeldResult) {
      setWinner(null);
      setSelectedOrder(null);
      setAwaitingRelease(false);
      setWinnerBurstKey((current) => current + 1);
    }

    registerTouchStart(event, { haptic: true });
    handleTouchEventInternal(event, true, shouldResetHeldResult);
  }

  function registerTouchStart(
    event: NativeSyntheticEvent<NativeTouchEvent>,
    options: { haptic: boolean }
  ) {
    const changedTouches = mapChangedTouchIds(event);
    musicController.ensureBaseOnInteraction();

    for (const _touch of changedTouches) {
      soundEffects.playPress();
      if (options.haptic) {
        playLightHaptic();
      }
    }
  }

  function registerUiTouchStart(event: NativeSyntheticEvent<NativeTouchEvent>) {
    registerTouchStart(event, { haptic: false });
  }

  function shouldIgnoreWebDevTouchEvent() {
    return (
      Platform.OS === 'web' &&
      __DEV__ &&
      (webDevTouchKeyRef.current !== null || webDevTouchesRef.current.length > 0)
    );
  }

  function handleTouchEventInternal(
    event: NativeSyntheticEvent<NativeTouchEvent>,
    isTouchStart: boolean,
    didResetHeldResult: boolean
  ) {
    lastTouchEventAtRef.current = Date.now();
    const nextTouches = mapTouches(event);
    const currentIds = new Set(nextTouches.map((touch) => touch.id));
    const changedTouches = mapChangedTouchIds(event);

    if (!didResetHeldResult && awaitingRelease && (winner || selectedOrder)) {
      for (const ignoredId of Array.from(ignoredTouchIds.current)) {
        if (!currentIds.has(ignoredId)) {
          ignoredTouchIds.current.delete(ignoredId);
        }
      }

      const filteredTouches = nextTouches.filter(
        (touch) => !ignoredTouchIds.current.has(touch.id)
      );

      if (filteredTouches.length === 0) {
        queueActiveTouches([]);
      }

      return;
    }

    const knownIds = new Set([
      ...activeTouchesRef.current.map((touch) => touch.id),
      ...ignoredTouchIds.current,
    ]);

    for (const touch of changedTouches) {
      const isNewTouch = !knownIds.has(touch.id);
      const isCenterTouch =
        surfaceSize.width > 0 &&
        surfaceSize.height > 0 &&
        isInsideCenterZone(touch.x, touch.y, surfaceSize);
      const isTopControlTouch =
        surfaceSize.width > 0 &&
        surfaceSize.height > 0 &&
        isInsideTopControlZone(touch.x, touch.y, surfaceSize);

      if (
        isTouchStart &&
        isNewTouch &&
        isCenterTouch &&
        roundMode === 'manual' &&
        activeTouchesRef.current.length >= 2 &&
        !winner &&
        !selectedOrder &&
        !awaitingRelease
      ) {
        completeRound(activeTouchesRef.current);
      }

      if (
        isNewTouch &&
        (isTopControlTouch || (roundMode === 'manual' && isCenterTouch))
      ) {
        ignoredTouchIds.current.add(touch.id);
      }
    }

    for (const ignoredId of Array.from(ignoredTouchIds.current)) {
      if (!currentIds.has(ignoredId)) {
        ignoredTouchIds.current.delete(ignoredId);
      }
    }

    const filteredTouches = nextTouches.filter(
      (touch) => !ignoredTouchIds.current.has(touch.id)
    );

    queueActiveTouches(filteredTouches);
  }

  function queueActiveTouches(nextTouches: TouchPoint[]) {
    pendingTouchesRef.current = nextTouches;

    if (touchFrameRef.current !== null) {
      return;
    }

    touchFrameRef.current = requestAnimationFrame(() => {
      touchFrameRef.current = null;
      const pendingTouches = pendingTouchesRef.current;

      if (!pendingTouches) {
        return;
      }

      pendingTouchesRef.current = null;
      setActiveTouches((currentTouches) =>
        areTouchesEqual(currentTouches, pendingTouches)
          ? currentTouches
          : pendingTouches
      );
    });
  }

  return {
    activeTouches,
    awaitingRelease,
    closeHelp: () => setIsHelpOpen(false),
    closeRoundMode: () => setIsRoundModeOpen(false),
    closeSettings: () => setIsSettingsOpen(false),
    handleTouchEvent,
    handleTouchStartEvent,
    handleUiTouchStart: registerUiTouchStart,
    handleWebDevMouseDown,
    handleSurfaceLayout,
    isChoosing:
      settings.animations &&
      activeTouches.length >= 2 &&
      !winner &&
      !selectedOrder &&
      !awaitingRelease,
    isHelpOpen,
    isRoundModeOpen,
    isSettingsOpen,
    openHelp: () => {
      soundEffects.playMenuOpen();
      setIsHelpOpen(true);
    },
    openRoundMode: () => {
      soundEffects.playMenuOpen();
      setIsRoundModeOpen(true);
    },
    openSettings: () => {
      soundEffects.playMenuOpen();
      setIsSettingsOpen(true);
    },
    playChosen: soundEffects.playChosen,
    playChosenWithRate: soundEffects.playChosenWithRate,
    playLightHaptic,
    playPress: soundEffects.playPress,
    playPlayerTone: soundEffects.playPlayerTone,
    playStartHaptic,
    playSuccessHaptic,
    playTapHaptic,
    playSlide: soundEffects.playSlide,
    playerLabels,
    remainingMs,
    roundMode,
    selectedOrder,
    selectWinner: completeRound,
    setActiveTouches,
    setRoundMode,
    setSettings,
    settings,
    surfaceSize,
    visibleTouches: winner ? [winner] : selectedOrder ?? activeTouches,
    winner,
    winnerBurstKey,
  };
}
