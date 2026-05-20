import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { CoinHistoryEntry, CoinMode, CoinSide } from '../types/game';
import { isTabletSize } from '../utils/layout';

const SkiaKit = require('@shopify/react-native-skia');
const { BlurMask, Canvas, Circle, Group, LinearGradient, Path, Skia, vec } = SkiaKit;
const CAN_RENDER_SKIA_PATHS = typeof Skia?.Path?.Make === 'function';

type CoinScreenProps = {
  animationsEnabled: boolean;
  historyByMode?: Record<CoinMode, CoinHistoryEntry[]>;
  history: CoinHistoryEntry[];
  mode: CoinMode;
  onChangeMode?: (direction: -1 | 1) => void;
  onCommitFlip: () => void;
  onFlip: () => CoinSide;
  onFlipResultSound?: (playbackRate?: number, volume?: number) => void;
  onFlipStartSound?: () => void;
  onFlipTickSound?: () => void;
  onFlipTone?: (playbackRate: number) => void;
  onSlideSound?: () => void;
  result: CoinSide | null;
};

type CoinFaceTheme = ReturnType<typeof getFaceTheme>;

const MIN_FLIP_HALF_TURNS = 6;
const MAX_EXTRA_FLIP_HALF_TURNS = 2;
const HALF_TURN_DURATION_MS = 85;
const COIN_JUMP_DURATION_MULTIPLIER = 3.3;
const COIN_WOBBLE_MAX_DEG = 18;
const DO_COIN_SYMBOL_SCALE = 0.75;
const COIN_SEQUENCE: CoinMode[] = [
  'heads-tails',
  'yes-no',
  'do-skip',
  'left-right',
  'odd-even',
];

export function CoinScreen({
  animationsEnabled,
  historyByMode,
  history,
  mode,
  onChangeMode,
  onCommitFlip,
  onFlip,
  onFlipResultSound,
  onFlipStartSound,
  onFlipTickSound,
  onFlipTone,
  onSlideSound,
  result,
}: CoinScreenProps) {
  const { height, width } = useWindowDimensions();
  const isCompactLandscape = width > height && height < 520;
  const isTablet = isTabletSize(width, height);
  const [positiveFace, negativeFace] = getCoinModeSides(mode);

  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeDirection = useRef<-1 | 1>(1);
  const flipProgress = useRef(new Animated.Value(0)).current;
  const halfTurnProgress = useRef(new Animated.Value(0)).current;
  const resultBurst = useRef(new Animated.Value(0)).current;
  const screenFlash = useRef(new Animated.Value(0)).current;
  const swipeProgress = useRef(new Animated.Value(1)).current;
  const rotationBaseDegRef = useRef(result === negativeFace ? 180 : 0);
  const targetHalfTurnsRef = useRef(0);
  const completedHalfTurnsRef = useRef(0);
  const halfTurnListenerIdRef = useRef<string | null>(null);
  const currentFaceRef = useRef<CoinSide>(result ?? positiveFace);
  const isFlippingRef = useRef(false);
  const [currentFace, setCurrentFace] = useState<CoinSide>(result ?? positiveFace);
  const [flashColor, setFlashColor] = useState('#54E6FF');
  const [isFlipping, setIsFlipping] = useState(false);
  const [wobble, setWobble] = useState({
    settleDeg: 0,
    tiltDeg: 0,
    twistDeg: 0,
  });

  useEffect(() => {
    if (isFlipping || currentFace === positiveFace || currentFace === negativeFace) {
      return;
    }

    setCurrentFace(positiveFace);
    currentFaceRef.current = positiveFace;
    rotationBaseDegRef.current = 0;
    halfTurnProgress.setValue(0);
  }, [currentFace, halfTurnProgress, isFlipping, negativeFace, positiveFace]);

  useEffect(() => {
    return () => {
      isFlippingRef.current = false;

      if (halfTurnListenerIdRef.current) {
        halfTurnProgress.removeListener(halfTurnListenerIdRef.current);
        halfTurnListenerIdRef.current = null;
      }
    };
  }, [halfTurnProgress]);

  useEffect(() => {
    if (!animationsEnabled) {
      flipProgress.setValue(0);
      halfTurnProgress.setValue(0);
    }
  }, [animationsEnabled, flipProgress, halfTurnProgress]);

  useEffect(() => {
    swipeProgress.stopAnimation();

    if (!animationsEnabled) {
      swipeProgress.setValue(1);
      return;
    }

    swipeProgress.setValue(0);
    Animated.timing(swipeProgress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationsEnabled, mode, swipeProgress]);

  const rotateX = flipProgress.interpolate({
    inputRange: [0, 0.22, 0.58, 0.82, 1],
    outputRange: [
      '10deg',
      `${-14 + wobble.tiltDeg * 0.5}deg`,
      `${-24 - wobble.tiltDeg}deg`,
      `${14 + wobble.tiltDeg * 0.35}deg`,
      '8deg',
    ],
  });
  const rotateZ = flipProgress.interpolate({
    inputRange: [0, 0.2, 0.46, 0.72, 1],
    outputRange: [
      '0deg',
      `${wobble.twistDeg}deg`,
      `${-wobble.twistDeg * 0.72}deg`,
      `${wobble.twistDeg * 0.38}deg`,
      `${wobble.settleDeg}deg`,
    ],
  });
  const lift = flipProgress.interpolate({
    inputRange: [0, 0.25, 0.64, 0.86, 1],
    outputRange: [0, -18, -42, 8, 0],
  });
  const scale = flipProgress.interpolate({
    inputRange: [0, 0.22, 0.54, 0.82, 1],
    outputRange: [1, 1.04, 0.9, 1.03, 1],
  });
  const blurOpacity = halfTurnProgress.interpolate({
    inputRange: [0, 0.28, 0.46, 0.5, 0.54, 0.72, 1],
    outputRange: [0, 0.04, 0.28, 0.42, 0.28, 0.04, 0],
  });
  const blurScaleX = halfTurnProgress.interpolate({
    inputRange: [0, 0.34, 0.5, 0.66, 1],
    outputRange: [0.82, 1.12, 1.92, 1.12, 0.82],
  });
  const blurScaleY = halfTurnProgress.interpolate({
    inputRange: [0, 0.38, 0.5, 0.62, 1],
    outputRange: [0.72, 0.86, 1.08, 0.86, 0.72],
  });
  const edgeOpacity = flipProgress.interpolate({
    inputRange: [0, 0.42, 0.5, 0.58, 1],
    outputRange: [0, 0.08, 0.28, 0.08, 0],
  });
  const sideGlowOpacity = halfTurnProgress.interpolate({
    inputRange: [0, 0.34, 0.5, 0.66, 1],
    outputRange: [0, 0.1, 0.38, 0.1, 0],
  });
  const faceOpacity = flipProgress.interpolate({
    inputRange: [0, 0.38, 0.5, 0.62, 1],
    outputRange: [1, 0.72, 0.08, 0.72, 1],
  });
  const screenFlashOpacity = screenFlash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.26],
  });
  const rotateY = halfTurnProgress.interpolate({
    inputRange: [0, 0.18, 0.48, 0.5, 0.52, 0.82, 1],
    outputRange: ['0deg', '18deg', '82deg', '89deg', '82deg', '18deg', '0deg'],
  });
  const mainCoinSlideX = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [lastSwipeDirection.current * 72, 0],
  });
  const mainCoinOpacity = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.44, 1],
  });
  const mainCoinScale = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.76, 1],
  });
  const leftCoinSlideX = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [72, -30] : [-18, -30],
  });
  const rightCoinSlideX = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [18, 30] : [-72, 30],
  });
  const leftCoinScale = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [1, 0.72] : [0.62, 0.72],
  });
  const rightCoinScale = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [0.62, 0.72] : [1, 0.72],
  });
  const leftCoinOpacity = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [0.92, 0.28] : [0.16, 0.28],
  });
  const rightCoinOpacity = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [0.16, 0.28] : [0.92, 0.28],
  });

  function isPositiveFace(side: CoinSide) {
    return side === positiveFace;
  }

  function getOppositeFace(side: CoinSide) {
    return side === positiveFace ? negativeFace : positiveFace;
  }

  function setVisibleFace(nextFace: CoinSide) {
    currentFaceRef.current = nextFace;
    setCurrentFace(nextFace);
  }

  function detachHalfTurnListener() {
    if (!halfTurnListenerIdRef.current) {
      return;
    }

    halfTurnProgress.removeListener(halfTurnListenerIdRef.current);
    halfTurnListenerIdRef.current = null;
  }

  function runHalfTurn(duration: number) {
    return new Promise<void>((resolve) => {
      let didSwitchFace = false;
      halfTurnProgress.stopAnimation();
      halfTurnProgress.setValue(0);
      detachHalfTurnListener();

      halfTurnListenerIdRef.current = halfTurnProgress.addListener(({ value }) => {
        if (didSwitchFace || value < 0.5) {
          return;
        }

        didSwitchFace = true;
        completedHalfTurnsRef.current += 1;
        setVisibleFace(getOppositeFace(currentFaceRef.current));
        onFlipTickSound?.();
      });

      Animated.timing(halfTurnProgress, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      }).start(() => {
        detachHalfTurnListener();

        if (!didSwitchFace && isFlippingRef.current) {
          completedHalfTurnsRef.current += 1;
          setVisibleFace(getOppositeFace(currentFaceRef.current));
          onFlipTickSound?.();
        }

        halfTurnProgress.setValue(0);
        resolve();
      });
    });
  }

  async function runFlipSequence(totalHalfTurns: number) {
    for (let index = 0; index < totalHalfTurns; index += 1) {
      if (!isFlippingRef.current) {
        return;
      }

      await runHalfTurn(HALF_TURN_DURATION_MS);
    }
  }

  function finishFlip(finalFace: CoinSide) {
    setFlashColor(getFaceTheme(finalFace).glowColor);
    resultBurst.stopAnimation();
    screenFlash.stopAnimation();
    resultBurst.setValue(0);
    screenFlash.setValue(0);

    Animated.parallel([
      Animated.timing(resultBurst, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(screenFlash, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(screenFlash, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    onFlipResultSound?.(isPositiveFace(finalFace) ? 1.1 : 0.92, 0.76);
    onFlipTone?.(isPositiveFace(finalFace) ? 1.14 : 0.8);
    onCommitFlip();
    setIsFlipping(false);
    isFlippingRef.current = false;
  }

  async function handleFlip() {
    if (isFlipping || isFlippingRef.current) {
      return;
    }

    const finalFace = onFlip();
    const startFace = currentFaceRef.current;

    isFlippingRef.current = true;
    setIsFlipping(true);
    setWobble(createCoinWobble());
    flipProgress.stopAnimation();
    flipProgress.setValue(0);
    halfTurnProgress.stopAnimation();
    halfTurnProgress.setValue(0);
    detachHalfTurnListener();
    onFlipStartSound?.();

    if (!animationsEnabled) {
      setVisibleFace(finalFace);
      rotationBaseDegRef.current = finalFace === negativeFace ? 180 : 0;
      completedHalfTurnsRef.current = 0;
      halfTurnProgress.setValue(0);
      finishFlip(finalFace);
      return;
    }

    const needsOppositeFace = startFace !== finalFace;
    const requiredParity = needsOppositeFace ? 1 : 0;
    let totalHalfTurns =
      MIN_FLIP_HALF_TURNS +
      Math.floor(Math.random() * (MAX_EXTRA_FLIP_HALF_TURNS + 1));

    if (totalHalfTurns % 2 !== requiredParity) {
      totalHalfTurns += 1;
    }

    const flipDuration = totalHalfTurns * HALF_TURN_DURATION_MS;
    const jumpDuration = Math.round(flipDuration * COIN_JUMP_DURATION_MULTIPLIER);
    targetHalfTurnsRef.current = totalHalfTurns;
    completedHalfTurnsRef.current = 0;
    const targetRotationDeg = rotationBaseDegRef.current + totalHalfTurns * 180;

    Animated.timing(flipProgress, {
      toValue: 1,
      duration: jumpDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    await runFlipSequence(totalHalfTurns);

    if (!isFlippingRef.current) {
      return;
    }

    detachHalfTurnListener();
    rotationBaseDegRef.current = targetRotationDeg % 360;

    if (completedHalfTurnsRef.current !== targetHalfTurnsRef.current) {
      console.warn('Coin flip finished with an unexpected half-turn count.', {
        completed: completedHalfTurnsRef.current,
        expected: targetHalfTurnsRef.current,
      });
    }

    if (currentFaceRef.current !== finalFace) {
      console.warn('Coin flip parity mismatch. No final face sync was applied.', {
        currentFace: currentFaceRef.current,
        finalFace,
        startFace,
        totalHalfTurns,
      });
      setIsFlipping(false);
      isFlippingRef.current = false;
      return;
    }

    finishFlip(finalFace);
  }

  function handleCarouselEnd(x: number, y: number) {
    const start = gestureStart.current;
    gestureStart.current = null;

    if (!start || isFlipping) {
      return;
    }

    const deltaX = x - start.x;
    const deltaY = y - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > 42 && absX > absY * 1.2) {
      lastSwipeDirection.current = deltaX > 0 ? -1 : 1;
      onSlideSound?.();
      onChangeMode?.(deltaX > 0 ? -1 : 1);
      return;
    }

    if (absX < 24 && absY < 24) {
      handleFlip();
    }
  }

  const theme = getFaceTheme(currentFace);
  const modeIndex = COIN_SEQUENCE.indexOf(mode);
  const prevMode = COIN_SEQUENCE[(modeIndex - 1 + COIN_SEQUENCE.length) % COIN_SEQUENCE.length];
  const nextMode = COIN_SEQUENCE[(modeIndex + 1) % COIN_SEQUENCE.length];

  return (
    <View
      style={[
        styles.screen,
        isTablet && styles.screenTablet,
        isCompactLandscape && styles.screenCompactLandscape,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.coinScreenFlash,
          { backgroundColor: flashColor, opacity: screenFlashOpacity },
        ]}
      />

      <Text style={styles.eyebrow}>Quick Flip</Text>

      <View
        onTouchEnd={(event) => {
          const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
          handleCarouselEnd(touch.pageX, touch.pageY);
        }}
        onTouchCancel={() => {
          gestureStart.current = null;
        }}
        onTouchStart={(event) => {
          const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
          gestureStart.current = { x: touch.pageX, y: touch.pageY };
        }}
        style={[
          styles.coinPressable,
          isTablet && styles.contentFrame,
          isCompactLandscape && styles.coinPressableCompact,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sideCoin,
            styles.sideCoinLeft,
            isCompactLandscape && styles.sideCoinCompact,
            {
              opacity: leftCoinOpacity,
              transform: [
                { translateX: leftCoinSlideX },
                { rotate: '-12deg' },
                { scale: leftCoinScale },
                ...(isTablet && !isCompactLandscape ? [{ scale: 1.08 }] : []),
                ...(isCompactLandscape ? [{ scale: 0.72 }] : []),
              ],
            },
          ]}
        >
          <CoinPreview history={historyByMode?.[prevMode] ?? history} mode={prevMode} />
        </Animated.View>

        <Animated.View
          style={[
            styles.coinWrap,
            {
              opacity: mainCoinOpacity,
              transform: [
                { translateX: mainCoinSlideX },
                { perspective: 980 },
                { translateY: lift },
                { rotateX },
                { rotateY },
                { rotateZ },
                { scale },
                { scale: mainCoinScale },
                ...(isTablet && !isCompactLandscape ? [{ scale: 1.08 }] : []),
                ...(isCompactLandscape ? [{ scale: 0.76 }] : []),
              ],
            },
          ]}
        >
          <View style={[styles.coinGlow, { backgroundColor: theme.glowColor }]} />
          <View style={styles.coinEdgeBack} />
          <View style={styles.coinEdgeMid} />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.coinMotionBlur,
              {
                opacity: blurOpacity,
                transform: [{ scaleX: blurScaleX }, { scaleY: blurScaleY }],
              },
            ]}
          >
            {CAN_RENDER_SKIA_PATHS ? <SkiaCoinMotionBlur color={theme.glowColor} /> : null}
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.coinMotionBlurTrail,
              {
                opacity: blurOpacity,
                borderColor: theme.glowColor,
                transform: [{ scaleX: blurScaleX }, { rotate: '-8deg' }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.coinMotionBlurTrail,
              styles.coinMotionBlurTrailAlt,
              {
                opacity: blurOpacity,
                borderColor: theme.glowColor,
                transform: [{ scaleX: blurScaleX }, { rotate: '8deg' }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.coinSideEdge,
              {
                opacity: Animated.add(edgeOpacity, sideGlowOpacity),
                backgroundColor: theme.edgeColor,
                shadowColor: theme.glowColor,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.coinFace,
              {
                opacity: faceOpacity,
                backgroundColor: theme.faceColor,
                borderColor: theme.borderColor,
                shadowColor: theme.glowColor,
              },
            ]}
          >
            <SkiaCoinFaceArt side={currentFace} theme={theme} />
            <View style={styles.coinFaceContent}>
              <Text style={[styles.coinFaceTitle, { color: theme.titleColor }]}>
                {currentFace}
              </Text>
              <Text style={styles.coinHintOnFace}>Tap to flip</Text>
            </View>
          </Animated.View>

          <View pointerEvents="none" style={styles.coinBurstAnchor}>
            <CoinResultBurst accent={flashColor} progress={resultBurst} />
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.sideCoin,
            styles.sideCoinRight,
            isCompactLandscape && styles.sideCoinCompact,
            {
              opacity: rightCoinOpacity,
              transform: [
                { translateX: rightCoinSlideX },
                { rotate: '12deg' },
                { scale: rightCoinScale },
                ...(isTablet && !isCompactLandscape ? [{ scale: 1.08 }] : []),
                ...(isCompactLandscape ? [{ scale: 0.72 }] : []),
              ],
            },
          ]}
        >
          <CoinPreview history={historyByMode?.[nextMode] ?? history} mode={nextMode} />
        </Animated.View>
      </View>

      <Text style={[styles.coinLabel, isCompactLandscape && styles.coinLabelCompact]}>
        {getCoinModeLabel(mode)}
      </Text>
      <Text
        style={[
          styles.coinResult,
          isCompactLandscape && styles.coinResultCompact,
          isPositiveFace(currentFace)
            ? styles.coinResultPositive
            : styles.coinResultNegative,
        ]}
      >
        {currentFace}
      </Text>

      <ScrollView
        contentContainerStyle={styles.historyContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.history,
          isTablet && styles.contentFrame,
          isCompactLandscape && styles.historyCompact,
        ]}
      >
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>No flips yet</Text>
        ) : (
          history.map((entry, index) => (
            <CoinHistoryChip
              accent={getCoinHistoryAccent(entry.result)}
              entryId={entry.id}
              isLatest={index === 0}
              key={entry.id}
              style={[
                styles.historyChip,
                getCoinHistoryChipStyle(entry.result),
                index === 0 && {
                  backgroundColor: `${getCoinHistoryAccent(entry.result)}26`,
                  borderColor: `${getCoinHistoryAccent(entry.result)}AA`,
                },
              ]}
            >
              <Text
                style={[
                  styles.historyValue,
                  getCoinHistoryValueStyle(entry.result),
                  index === 0 && styles.historyValueLatest,
                ]}
              >
                {entry.result}
              </Text>
            </CoinHistoryChip>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function CoinHistoryChip({
  accent,
  children,
  entryId,
  isLatest,
  style,
}: {
  accent: string;
  children: ReactNode;
  entryId: string;
  isLatest: boolean;
  style: object;
}) {
  const appear = useRef(new Animated.Value(isLatest ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    appear.stopAnimation();
    pulse.stopAnimation();

    if (!isLatest) {
      Animated.parallel([
        Animated.timing(appear, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    appear.setValue(0);
    Animated.sequence([
      Animated.timing(appear, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.8)),
        useNativeDriver: false,
      }),
      Animated.timing(appear, {
        toValue: 0.92,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(appear, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [appear, entryId, isLatest, pulse]);

  const opacity = appear.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 1, 1],
  });
  const translateY = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const scale = appear.interpolate({
    inputRange: [0, 0.55, 0.92, 1],
    outputRange: [0.78, 1.12, 0.98, 1],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.045],
  });

  return (
    <Animated.View
      style={[
        style,
        isLatest && styles.historyChipAnimatedLatest,
        isLatest && { shadowColor: accent },
        { opacity, transform: [{ translateY }, { scale }, { scale: pulseScale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function CoinPreview({
  history,
  mode,
}: {
  history: CoinHistoryEntry[];
  mode: CoinMode;
}) {
  const [fallbackSide] = getCoinModeSides(mode);
  const side = history.find((entry) => isCoinSideInMode(entry.result, mode))?.result ?? fallbackSide;
  const theme = getFaceTheme(side);

  return (
    <View style={[styles.previewCoinFace, { borderColor: theme.borderColor }]}>
      <View style={styles.previewCoinArtScale}>
        <SkiaCoinFaceArt side={side} theme={theme} />
      </View>
      <Text style={[styles.previewCoinText, { color: theme.titleColor }]}>
        {side}
      </Text>
    </View>
  );
}

function CoinResultBurst({
  accent,
  progress,
}: {
  accent: string;
  progress: Animated.Value;
}) {
  const rays = [0, 60, 120, 180, 240, 300];

  return (
    <View pointerEvents="none" style={styles.resultBurstWrap}>
      <Animated.View
        style={[
          styles.resultBurstRing,
          {
            borderColor: accent,
            opacity: progress.interpolate({
              inputRange: [0, 0.32, 1],
              outputRange: [0, 0.82, 0],
            }),
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.12, 2.6],
                }),
              },
            ],
          },
        ]}
      />
      {rays.map((angle, index) => (
        <Animated.View
          key={`coin-burst-${index}`}
          style={[
            styles.resultBurstRay,
            {
              backgroundColor: accent,
              opacity: progress.interpolate({
                inputRange: [0, 0.18, 1],
                outputRange: [0, 1, 0],
              }),
              shadowColor: accent,
              transform: [
                { rotate: `${angle}deg` },
                {
                  translateY: Animated.multiply(
                    progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 118],
                    }),
                    -1
                  ),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function createCoinWobble() {
  const direction = Math.random() > 0.5 ? 1 : -1;
  const strength = 0.55 + Math.random() * 0.45;
  const twistDeg = direction * COIN_WOBBLE_MAX_DEG * strength;

  return {
    settleDeg: direction * (Math.random() * 3 - 1.5),
    tiltDeg: (Math.random() * 2 - 1) * 8 * strength,
    twistDeg,
  };
}

function SkiaCoinMotionBlur({ color }: { color: string }) {
  if (!CAN_RENDER_SKIA_PATHS) {
    return null;
  }

  const path = Skia.Path.Make();
  path.moveTo(18, 23);
  path.cubicTo(52, 0, 176, 0, 210, 23);
  path.cubicTo(176, 46, 52, 46, 18, 23);
  path.close();

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Group opacity={0.72}>
        <Path path={path} color={color}>
          <BlurMask blur={14} style="solid" />
        </Path>
      </Group>
      <Path path={path} color={`${color}88`} style="stroke" strokeWidth={1.4}>
        <BlurMask blur={4} style="solid" />
      </Path>
    </Canvas>
  );
}

function SkiaCoinFaceArt({ side, theme }: { side: CoinSide; theme: CoinFaceTheme }) {
  if (!CAN_RENDER_SKIA_PATHS) {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.coinFaceArtFallback,
          {
            backgroundColor: theme.faceColor,
            borderColor: theme.borderColor,
            shadowColor: theme.glowColor,
          },
        ]}
      />
    );
  }

  const orbitA = Skia.Path.Make();
  orbitA.moveTo(38, 116);
  orbitA.cubicTo(72, 58, 152, 56, 188, 110);
  orbitA.cubicTo(150, 158, 78, 160, 38, 116);

  const orbitB = Skia.Path.Make();
  orbitB.moveTo(50, 104);
  orbitB.cubicTo(92, 72, 154, 76, 176, 126);
  orbitB.cubicTo(132, 146, 82, 142, 50, 104);

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Circle cx={113} cy={113} r={113} color={theme.faceColor} />
      <Circle cx={113} cy={113} r={106} color={theme.glowColor} opacity={0.16}>
        <BlurMask blur={24} style="solid" />
      </Circle>
      <Circle cx={113} cy={113} r={86} color={theme.ringColor} style="stroke" strokeWidth={2}>
        <BlurMask blur={2} style="solid" />
      </Circle>
      {side === 'Heads' ? (
        <SkiaHeadsSymbol orbitA={orbitA} orbitB={orbitB} theme={theme} />
      ) : side === 'Tails' ? (
        <SkiaTailsSymbol theme={theme} />
      ) : side === 'Yes' ? (
        <SkiaYesSymbol theme={theme} />
      ) : side === 'No' ? (
        <SkiaNoSymbol theme={theme} />
      ) : side === 'Do' ? (
        <Group origin={vec(113, 113)} transform={[{ scale: DO_COIN_SYMBOL_SCALE }]}>
          <SkiaDoSymbol theme={theme} />
        </Group>
      ) : side === 'Skip' ? (
        <SkiaSkipSymbol theme={theme} />
      ) : side === 'Left' ? (
        <SkiaArrowSymbol direction="left" theme={theme} />
      ) : side === 'Right' ? (
        <SkiaArrowSymbol direction="right" theme={theme} />
      ) : side === 'Odd' ? (
        <SkiaOddSymbol theme={theme} />
      ) : (
        <SkiaEvenSymbol theme={theme} />
      )}
      <Circle cx={113} cy={113} r={113} style="stroke" strokeWidth={2}>
        <LinearGradient
          colors={[theme.borderColor, theme.glowColor, theme.borderColor]}
          end={vec(226, 226)}
          start={vec(0, 0)}
        />
      </Circle>
    </Canvas>
  );
}

function SkiaHeadsSymbol({
  orbitA,
  orbitB,
  theme,
}: {
  orbitA: ReturnType<typeof Skia.Path.Make>;
  orbitB: ReturnType<typeof Skia.Path.Make>;
  theme: CoinFaceTheme;
}) {
  return (
    <>
      <Path path={orbitA} color={theme.orbitAColor} style="stroke" strokeWidth={2.8}>
        <BlurMask blur={3} style="solid" />
      </Path>
      <Path path={orbitB} color={theme.orbitBColor} style="stroke" strokeWidth={2}>
        <BlurMask blur={2.2} style="solid" />
      </Path>
      <Circle cx={113} cy={113} r={44} color={theme.coreRingColor} style="stroke" strokeWidth={3}>
        <BlurMask blur={5} style="solid" />
      </Circle>
      <Circle cx={113} cy={113} r={18} color={`${theme.glowColor}88`}>
        <BlurMask blur={12} style="solid" />
      </Circle>
      <Circle cx={113} cy={113} r={8} color={theme.coreDotColor}>
        <BlurMask blur={2} style="solid" />
      </Circle>
      <Circle cx={85} cy={94} r={4} color={theme.coreDotColor} />
      <Circle cx={152} cy={126} r={4} color={theme.coreDotColor} />
      <Circle cx={124} cy={151} r={3.5} color={theme.coreDotColor} />
    </>
  );
}

function SkiaTailsSymbol({ theme }: { theme: CoinFaceTheme }) {
  const splitA = Skia.Path.Make();
  splitA.moveTo(70, 76);
  splitA.cubicTo(112, 102, 128, 104, 164, 78);

  const splitB = Skia.Path.Make();
  splitB.moveTo(70, 150);
  splitB.cubicTo(112, 124, 128, 122, 164, 148);

  const spine = Skia.Path.Make();
  spine.moveTo(78, 113);
  spine.cubicTo(102, 92, 130, 134, 154, 113);

  return (
    <>
      <Path path={splitA} color={theme.orbitAColor} style="stroke" strokeCap="round" strokeWidth={8}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={splitB} color={theme.orbitBColor} style="stroke" strokeCap="round" strokeWidth={8}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={spine} color={theme.coreRingColor} style="stroke" strokeCap="round" strokeWidth={4}>
        <BlurMask blur={3} style="solid" />
      </Path>
      <Circle cx={70} cy={76} r={7} color={theme.coreDotColor}>
        <BlurMask blur={3} style="solid" />
      </Circle>
      <Circle cx={164} cy={148} r={7} color={theme.coreDotColor}>
        <BlurMask blur={3} style="solid" />
      </Circle>
      <Circle cx={113} cy={113} r={56} color={theme.ringColor} style="stroke" strokeWidth={1.6} />
    </>
  );
}

function SkiaYesSymbol({ theme }: { theme: CoinFaceTheme }) {
  const check = Skia.Path.Make();
  check.moveTo(70, 116);
  check.lineTo(101, 147);
  check.lineTo(158, 80);

  const halo = Skia.Path.Make();
  halo.moveTo(62, 116);
  halo.cubicTo(82, 62, 150, 62, 166, 116);
  halo.cubicTo(144, 164, 82, 166, 62, 116);

  return (
    <>
      <Path path={halo} color={theme.orbitAColor} style="stroke" strokeWidth={2.4}>
        <BlurMask blur={4} style="solid" />
      </Path>
      <Path path={check} color={theme.coreDotColor} style="stroke" strokeCap="round" strokeJoin="round" strokeWidth={12}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={check} color={theme.titleColor} style="stroke" strokeCap="round" strokeJoin="round" strokeWidth={5} />
      <Circle cx={113} cy={113} r={68} color={theme.ringColor} style="stroke" strokeWidth={1.5} />
    </>
  );
}

function SkiaNoSymbol({ theme }: { theme: CoinFaceTheme }) {
  const crossA = Skia.Path.Make();
  crossA.moveTo(78, 78);
  crossA.lineTo(148, 148);

  const crossB = Skia.Path.Make();
  crossB.moveTo(148, 78);
  crossB.lineTo(78, 148);

  return (
    <>
      <Circle cx={113} cy={113} r={58} color={theme.orbitAColor} style="stroke" strokeWidth={6}>
        <BlurMask blur={5} style="solid" />
      </Circle>
      <Path path={crossA} color={theme.coreDotColor} style="stroke" strokeCap="round" strokeWidth={10}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={crossB} color={theme.coreDotColor} style="stroke" strokeCap="round" strokeWidth={10}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={crossA} color={theme.titleColor} style="stroke" strokeCap="round" strokeWidth={4} />
      <Path path={crossB} color={theme.titleColor} style="stroke" strokeCap="round" strokeWidth={4} />
      <Circle cx={113} cy={113} r={72} color={theme.ringColor} style="stroke" strokeWidth={1.4} />
    </>
  );
}

function SkiaDoSymbol({ theme }: { theme: CoinFaceTheme }) {
  const bolt = Skia.Path.Make();
  bolt.moveTo(124, 54);
  bolt.lineTo(78, 118);
  bolt.lineTo(116, 118);
  bolt.lineTo(98, 172);
  bolt.lineTo(154, 100);
  bolt.lineTo(118, 100);
  bolt.close();

  return (
    <>
      <Path path={bolt} color={theme.coreDotColor}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={bolt} color={theme.titleColor} style="stroke" strokeJoin="round" strokeWidth={3} />
      <Circle cx={113} cy={113} r={68} color={theme.ringColor} style="stroke" strokeWidth={1.6} />
    </>
  );
}

function SkiaSkipSymbol({ theme }: { theme: CoinFaceTheme }) {
  const forwardA = Skia.Path.Make();
  forwardA.moveTo(72, 72);
  forwardA.lineTo(116, 113);
  forwardA.lineTo(72, 154);
  forwardA.close();

  const forwardB = Skia.Path.Make();
  forwardB.moveTo(116, 72);
  forwardB.lineTo(160, 113);
  forwardB.lineTo(116, 154);
  forwardB.close();

  return (
    <>
      <Path path={forwardA} color={theme.coreDotColor}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={forwardB} color={theme.coreDotColor}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Circle cx={113} cy={113} r={64} color={theme.ringColor} style="stroke" strokeWidth={1.6} />
    </>
  );
}

function SkiaArrowSymbol({
  direction,
  theme,
}: {
  direction: 'left' | 'right';
  theme: CoinFaceTheme;
}) {
  const arrow = Skia.Path.Make();
  if (direction === 'left') {
    arrow.moveTo(70, 113);
    arrow.lineTo(118, 70);
    arrow.lineTo(118, 96);
    arrow.lineTo(160, 96);
    arrow.lineTo(160, 130);
    arrow.lineTo(118, 130);
    arrow.lineTo(118, 156);
  } else {
    arrow.moveTo(156, 113);
    arrow.lineTo(108, 70);
    arrow.lineTo(108, 96);
    arrow.lineTo(66, 96);
    arrow.lineTo(66, 130);
    arrow.lineTo(108, 130);
    arrow.lineTo(108, 156);
  }
  arrow.close();

  return (
    <>
      <Path path={arrow} color={theme.coreDotColor}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={arrow} color={theme.titleColor} style="stroke" strokeJoin="round" strokeWidth={3} />
      <Circle cx={113} cy={113} r={70} color={theme.ringColor} style="stroke" strokeWidth={1.5} />
    </>
  );
}

function SkiaOddSymbol({ theme }: { theme: CoinFaceTheme }) {
  const diamond = Skia.Path.Make();
  diamond.moveTo(113, 48);
  diamond.lineTo(168, 113);
  diamond.lineTo(113, 178);
  diamond.lineTo(58, 113);
  diamond.close();

  return (
    <>
      <Path path={diamond} color={theme.orbitAColor} style="stroke" strokeJoin="round" strokeWidth={6}>
        <BlurMask blur={5} style="solid" />
      </Path>
      <Circle cx={113} cy={113} r={16} color={theme.coreDotColor}>
        <BlurMask blur={6} style="solid" />
      </Circle>
      <Circle cx={113} cy={113} r={52} color={theme.ringColor} style="stroke" strokeWidth={1.6} />
    </>
  );
}

function SkiaEvenSymbol({ theme }: { theme: CoinFaceTheme }) {
  return (
    <>
      <Circle cx={92} cy={113} r={24} color={theme.coreDotColor}>
        <BlurMask blur={5} style="solid" />
      </Circle>
      <Circle cx={134} cy={113} r={24} color={theme.coreDotColor}>
        <BlurMask blur={5} style="solid" />
      </Circle>
      <Circle cx={92} cy={113} r={10} color={theme.faceColor} />
      <Circle cx={134} cy={113} r={10} color={theme.faceColor} />
      <Circle cx={113} cy={113} r={64} color={theme.ringColor} style="stroke" strokeWidth={1.6} />
    </>
  );
}

function getFaceTheme(side: CoinSide) {
  switch (side) {
    case 'Heads':
      return {
        borderColor: 'rgba(101, 230, 255, 0.58)',
        coreDotColor: '#96FFFF',
        coreRingColor: 'rgba(110, 245, 255, 0.84)',
        edgeColor: 'rgba(118, 240, 255, 0.64)',
        faceColor: '#071326',
        glowColor: '#54E6FF',
        orbitAColor: 'rgba(0, 228, 255, 0.26)',
        orbitBColor: 'rgba(103, 242, 255, 0.42)',
        ringColor: 'rgba(0, 228, 255, 0.24)',
        titleColor: '#8AF4FF',
      };
    case 'Tails':
      return {
        borderColor: 'rgba(255, 79, 216, 0.6)',
        coreDotColor: '#FFD1F5',
        coreRingColor: 'rgba(255, 143, 228, 0.8)',
        edgeColor: 'rgba(255, 122, 226, 0.62)',
        faceColor: '#17081A',
        glowColor: '#FF6BDD',
        orbitAColor: 'rgba(255, 79, 216, 0.38)',
        orbitBColor: 'rgba(255, 155, 235, 0.34)',
        ringColor: 'rgba(255, 79, 216, 0.22)',
        titleColor: '#FF9FE8',
      };
    case 'Yes':
      return {
        borderColor: 'rgba(110, 255, 170, 0.62)',
        coreDotColor: '#D3FFE8',
        coreRingColor: 'rgba(144, 255, 194, 0.86)',
        edgeColor: 'rgba(144, 255, 194, 0.62)',
        faceColor: '#071A13',
        glowColor: '#57FFAF',
        orbitAColor: 'rgba(110, 255, 170, 0.32)',
        orbitBColor: 'rgba(174, 255, 208, 0.28)',
        ringColor: 'rgba(110, 255, 170, 0.22)',
        titleColor: '#8EFFC2',
      };
    case 'No':
      return {
        borderColor: 'rgba(255, 99, 127, 0.62)',
        coreDotColor: '#FFD2DA',
        coreRingColor: 'rgba(255, 128, 151, 0.84)',
        edgeColor: 'rgba(255, 128, 151, 0.6)',
        faceColor: '#190A10',
        glowColor: '#FF5B6E',
        orbitAColor: 'rgba(255, 91, 110, 0.36)',
        orbitBColor: 'rgba(255, 157, 173, 0.28)',
        ringColor: 'rgba(255, 91, 110, 0.2)',
        titleColor: '#FF9AA8',
      };
    case 'Do':
      return {
        borderColor: 'rgba(255, 214, 82, 0.62)',
        coreDotColor: '#FFF3B0',
        coreRingColor: 'rgba(255, 226, 112, 0.86)',
        edgeColor: 'rgba(255, 211, 82, 0.62)',
        faceColor: '#171207',
        glowColor: '#FFD64A',
        orbitAColor: 'rgba(255, 214, 82, 0.34)',
        orbitBColor: 'rgba(255, 239, 156, 0.28)',
        ringColor: 'rgba(255, 214, 82, 0.22)',
        titleColor: '#FFE77A',
      };
    case 'Skip':
      return {
        borderColor: 'rgba(126, 148, 255, 0.62)',
        coreDotColor: '#D7DDFF',
        coreRingColor: 'rgba(154, 172, 255, 0.84)',
        edgeColor: 'rgba(137, 157, 255, 0.62)',
        faceColor: '#0A0C1E',
        glowColor: '#7A8DFF',
        orbitAColor: 'rgba(126, 148, 255, 0.34)',
        orbitBColor: 'rgba(194, 203, 255, 0.26)',
        ringColor: 'rgba(126, 148, 255, 0.22)',
        titleColor: '#AEBBFF',
      };
    case 'Left':
      return {
        borderColor: 'rgba(57, 255, 210, 0.62)',
        coreDotColor: '#C6FFF4',
        coreRingColor: 'rgba(99, 255, 221, 0.86)',
        edgeColor: 'rgba(73, 255, 215, 0.62)',
        faceColor: '#061815',
        glowColor: '#39FFD2',
        orbitAColor: 'rgba(57, 255, 210, 0.32)',
        orbitBColor: 'rgba(165, 255, 236, 0.28)',
        ringColor: 'rgba(57, 255, 210, 0.22)',
        titleColor: '#8FFFF0',
      };
    case 'Right':
      return {
        borderColor: 'rgba(255, 138, 61, 0.64)',
        coreDotColor: '#FFE0C9',
        coreRingColor: 'rgba(255, 166, 94, 0.84)',
        edgeColor: 'rgba(255, 150, 74, 0.62)',
        faceColor: '#190D06',
        glowColor: '#FF8A3D',
        orbitAColor: 'rgba(255, 138, 61, 0.34)',
        orbitBColor: 'rgba(255, 197, 154, 0.28)',
        ringColor: 'rgba(255, 138, 61, 0.22)',
        titleColor: '#FFC095',
      };
    case 'Odd':
      return {
        borderColor: 'rgba(192, 107, 255, 0.64)',
        coreDotColor: '#F1D4FF',
        coreRingColor: 'rgba(210, 143, 255, 0.86)',
        edgeColor: 'rgba(198, 124, 255, 0.62)',
        faceColor: '#15071C',
        glowColor: '#C06BFF',
        orbitAColor: 'rgba(192, 107, 255, 0.36)',
        orbitBColor: 'rgba(229, 185, 255, 0.28)',
        ringColor: 'rgba(192, 107, 255, 0.22)',
        titleColor: '#DEA3FF',
      };
    case 'Even':
      return {
        borderColor: 'rgba(76, 155, 255, 0.64)',
        coreDotColor: '#D1E6FF',
        coreRingColor: 'rgba(116, 180, 255, 0.86)',
        edgeColor: 'rgba(89, 166, 255, 0.62)',
        faceColor: '#07101F',
        glowColor: '#4D9BFF',
        orbitAColor: 'rgba(76, 155, 255, 0.36)',
        orbitBColor: 'rgba(170, 212, 255, 0.28)',
        ringColor: 'rgba(76, 155, 255, 0.22)',
        titleColor: '#9AC9FF',
      };
  }
}

function getCoinHistoryChipStyle(side: CoinSide) {
  const accent = getCoinHistoryAccent(side);

  return {
    backgroundColor: `${accent}18`,
    borderColor: `${accent}5C`,
  };
}

function getCoinHistoryValueStyle(side: CoinSide) {
  return { color: getCoinHistoryAccent(side) };
}

function getCoinHistoryAccent(side: CoinSide) {
  return getFaceTheme(side).glowColor;
}

function isCoinSideInMode(side: CoinSide, mode: CoinMode) {
  const [positive, negative] = getCoinModeSides(mode);
  return side === positive || side === negative;
}

function getCoinModeSides(mode: CoinMode): [CoinSide, CoinSide] {
  switch (mode) {
    case 'do-skip':
      return ['Do', 'Skip'];
    case 'heads-tails':
      return ['Heads', 'Tails'];
    case 'left-right':
      return ['Left', 'Right'];
    case 'odd-even':
      return ['Odd', 'Even'];
    case 'yes-no':
      return ['Yes', 'No'];
  }
}

function getCoinModeLabel(mode: CoinMode) {
  const [positive, negative] = getCoinModeSides(mode);
  return `${positive} / ${negative}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 140,
    alignItems: 'center',
  },
  screenTablet: {
    paddingTop: 122,
  },
  screenCompactLandscape: {
    paddingTop: 82,
  },
  coinScreenFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  eyebrow: {
    color: '#88B4D9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  coinPressable: {
    marginTop: 22,
    width: 410,
    maxWidth: '100%',
    height: 292,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentFrame: {
    maxWidth: 760,
  },
  coinPressableCompact: {
    marginTop: 6,
    height: 176,
  },
  sideCoin: {
    position: 'absolute',
    top: 82,
    width: 104,
    height: 104,
    zIndex: 0,
  },
  sideCoinCompact: {
    top: 44,
  },
  sideCoinLeft: {
    left: 2,
  },
  sideCoinRight: {
    right: 2,
  },
  previewCoinFace: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewCoinArtScale: {
    position: 'absolute',
    left: -61,
    top: -61,
    width: 226,
    height: 226,
    transform: [{ scale: 0.46 }],
  },
  previewCoinText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.4,
    textShadowColor: 'rgba(255, 255, 255, 0.24)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  coinWrap: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  coinGlow: {
    position: 'absolute',
    width: 238,
    height: 238,
    borderRadius: 119,
    opacity: 0.12,
    transform: [{ scale: 1.08 }],
  },
  coinEdgeBack: {
    position: 'absolute',
    top: 18,
    left: 22,
    right: 0,
    bottom: 0,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  coinEdgeMid: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 6,
    bottom: 6,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coinMotionBlur: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 90,
    height: 46,
    borderRadius: 999,
  },
  coinMotionBlurTrail: {
    position: 'absolute',
    left: 34,
    right: 34,
    top: 72,
    height: 92,
    borderRadius: 999,
    borderWidth: 1,
  },
  coinMotionBlurTrailAlt: {
    top: 82,
    height: 72,
  },
  coinSideEdge: {
    position: 'absolute',
    top: 28,
    bottom: 28,
    width: 14,
    borderRadius: 999,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  coinFace: {
    width: 226,
    height: 226,
    borderRadius: 113,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    shadowOpacity: 0.42,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  coinFaceContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinFaceArtFallback: {
    borderRadius: 113,
    borderWidth: 2,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  coinFaceTitle: {
    position: 'absolute',
    top: 30,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  coinHintOnFace: {
    position: 'absolute',
    bottom: 34,
    color: '#91A9C1',
    fontSize: 14,
  },
  coinLabel: {
    marginTop: 14,
    color: '#C6F7FF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  coinLabelCompact: {
    marginTop: 0,
  },
  coinResult: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.24)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  coinResultCompact: {
    marginTop: 3,
    fontSize: 28,
  },
  coinResultPositive: {
    color: '#CFFFF0',
  },
  coinResultNegative: {
    color: '#FFD5EA',
  },
  coinBurstAnchor: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBurstWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBurstRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 88,
    height: 88,
    marginLeft: -44,
    marginTop: -44,
    borderRadius: 999,
    borderWidth: 2,
  },
  resultBurstRay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 8,
    height: 44,
    marginLeft: -4,
    marginTop: -22,
    borderRadius: 999,
    shadowOpacity: 0.88,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  history: {
    marginTop: 18,
    maxHeight: 94,
    paddingBottom: 8,
    paddingTop: 12,
  },
  historyCompact: {
    marginTop: 6,
    maxHeight: 64,
    paddingBottom: 2,
    paddingTop: 4,
  },
  historyContent: {
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  historyChip: {
    minHeight: 48,
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyChipAnimatedLatest: {
    shadowOpacity: 0.82,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  historyValue: {
    color: '#F5FCFF',
    fontSize: 17,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 21,
    textAlignVertical: 'center',
  },
  historyValueLatest: {
    color: '#FFF4FC',
  },
  emptyHistory: {
    color: '#8099B8',
    fontSize: 14,
    paddingHorizontal: 8,
  },
});
