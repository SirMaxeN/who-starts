import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CoinHistoryEntry, CoinMode, CoinSide } from '../types/game';

type CoinScreenProps = {
  animationsEnabled: boolean;
  history: CoinHistoryEntry[];
  mode: CoinMode;
  onCommitFlip: () => void;
  onFlip: () => CoinSide;
  onFlipResultSound?: (playbackRate?: number, volume?: number) => void;
  onFlipStartSound?: () => void;
  onFlipTickSound?: () => void;
  onFlipTone?: (playbackRate: number) => void;
  result: CoinSide | null;
};

const MIN_FLIP_HALF_TURNS = 6;
const MAX_EXTRA_FLIP_HALF_TURNS = 2;
const HALF_TURN_DURATION_MS = 85;
const COIN_JUMP_DURATION_MULTIPLIER = 3.3;

export function CoinScreen({
  animationsEnabled,
  history,
  mode,
  onCommitFlip,
  onFlip,
  onFlipResultSound,
  onFlipStartSound,
  onFlipTickSound,
  onFlipTone,
  result,
}: CoinScreenProps) {
  const positiveFace: CoinSide = mode === 'heads-tails' ? 'Heads' : 'Yes';
  const negativeFace: CoinSide = mode === 'heads-tails' ? 'Tails' : 'No';
  const isHeadsTailsMode = mode === 'heads-tails';

  const flipProgress = useRef(new Animated.Value(0)).current;
  const halfTurnProgress = useRef(new Animated.Value(0)).current;
  const resultBurst = useRef(new Animated.Value(0)).current;
  const screenFlash = useRef(new Animated.Value(0)).current;
  const rotationBaseDegRef = useRef(result === negativeFace ? 180 : 0);
  const targetHalfTurnsRef = useRef(0);
  const completedHalfTurnsRef = useRef(0);
  const halfTurnListenerIdRef = useRef<string | null>(null);
  const currentFaceRef = useRef<CoinSide>(result ?? positiveFace);
  const isFlippingRef = useRef(false);
  const [currentFace, setCurrentFace] = useState<CoinSide>(result ?? positiveFace);
  const [flashColor, setFlashColor] = useState('#54E6FF');
  const [isFlipping, setIsFlipping] = useState(false);

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

  const rotateX = flipProgress.interpolate({
    inputRange: [0, 0.22, 0.58, 0.82, 1],
    outputRange: ['10deg', '-14deg', '-24deg', '14deg', '8deg'],
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
    setFlashColor(isPositiveFace(finalFace) ? '#54E6FF' : '#FF4FD8');
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

  const theme = getFaceTheme(currentFace);

  return (
    <View style={styles.screen}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.coinScreenFlash,
          { backgroundColor: flashColor, opacity: screenFlashOpacity },
        ]}
      />

      <Text style={styles.eyebrow}>Quick Coin Flip</Text>

      <Pressable disabled={isFlipping} onPress={handleFlip} style={styles.coinPressable}>
        <Animated.View
          style={[
            styles.coinWrap,
            {
              transform: [
                { perspective: 980 },
                { translateY: lift },
                { rotateX },
                { rotateY },
                { scale },
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
                backgroundColor: theme.glowColor,
                transform: [{ scaleX: blurScaleX }, { scaleY: blurScaleY }],
              },
            ]}
          />
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
            <View style={styles.coinFaceContent}>
              <View style={[styles.coinInnerRing, { borderColor: theme.ringColor }]} />
              <View style={[styles.coinOrbitA, { borderColor: theme.orbitAColor }]} />
              <View style={[styles.coinOrbitB, { borderColor: theme.orbitBColor }]} />

              <View style={styles.coinCenterSymbol}>
                <View
                  style={[
                    styles.coinCoreRing,
                    {
                      borderColor: theme.coreRingColor,
                      shadowColor: theme.glowColor,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.coinCoreDot,
                    { backgroundColor: theme.coreDotColor },
                  ]}
                />
              </View>

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
      </Pressable>

      <Text style={styles.coinLabel}>{isHeadsTailsMode ? 'Heads / Tails' : 'Yes / No'}</Text>
      <Text
        style={[
          styles.coinResult,
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
        style={styles.history}
      >
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>No flips yet</Text>
        ) : (
          history.map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.historyChip,
                getCoinHistoryChipStyle(entry.result),
                index === 0 && styles.historyChipLatest,
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
            </View>
          ))
        )}
      </ScrollView>
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
  }
}

function getCoinHistoryChipStyle(side: CoinSide) {
  return side === 'Heads' || side === 'Yes'
    ? styles.historyChipPositive
    : styles.historyChipNegative;
}

function getCoinHistoryValueStyle(side: CoinSide) {
  return side === 'Heads' || side === 'Yes'
    ? styles.historyValuePositive
    : styles.historyValueNegative;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 140,
    alignItems: 'center',
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
    marginTop: 30,
    width: 268,
    height: 268,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinWrap: {
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
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
  coinInnerRing: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
  },
  coinOrbitA: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1,
    transform: [{ rotate: '28deg' }, { scaleX: 1.36 }],
  },
  coinOrbitB: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    transform: [{ rotate: '-34deg' }, { scaleX: 1.48 }],
  },
  coinCenterSymbol: {
    position: 'absolute',
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCoreRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    shadowOpacity: 0.78,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  coinCoreDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 999,
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
  coinResult: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.24)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
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
    marginTop: 26,
    maxHeight: 74,
  },
  historyContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  historyChip: {
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyChipLatest: {
    backgroundColor: 'rgba(255, 79, 216, 0.16)',
    borderColor: 'rgba(255, 79, 216, 0.45)',
  },
  historyChipPositive: {
    backgroundColor: 'rgba(87, 255, 175, 0.12)',
    borderColor: 'rgba(87, 255, 175, 0.32)',
  },
  historyChipNegative: {
    backgroundColor: 'rgba(255, 91, 110, 0.12)',
    borderColor: 'rgba(255, 91, 110, 0.3)',
  },
  historyValue: {
    color: '#F5FCFF',
    fontSize: 17,
    fontWeight: '800',
  },
  historyValuePositive: {
    color: '#CBFFE7',
  },
  historyValueNegative: {
    color: '#FFD3DA',
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
