import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DiceHistoryEntry, DiceKind } from '../types/game';

type DiceScreenProps = {
  animationsEnabled: boolean;
  history: DiceHistoryEntry[];
  onChangeKind: (direction: -1 | 1) => void;
  onCommitRoll: () => void;
  onRollChosenSound?: () => void;
  onRollChosenSoundWithRate?: (playbackRate: number, volume?: number) => void;
  onRollExtremeTone?: (playbackRate: number) => void;
  onSwipeSound?: () => void;
  onRollTickSound?: () => void;
  onRoll: () => number;
  result: number | null;
  selectedKind: DiceKind;
};

type DieModelProps = {
  accent?: string;
  burstProgress?: Animated.Value;
  kind: DiceKind;
  muted?: boolean;
  result: number | null;
  resultScale?: Animated.Value;
};

const DICE_SEQUENCE: DiceKind[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

const DICE_META: Record<DiceKind, { accent: string; sides: number }> = {
  d10: { accent: '#FF4FD8', sides: 10 },
  d12: { accent: '#9B6BFF', sides: 12 },
  d20: { accent: '#FF5B6E', sides: 20 },
  d4: { accent: '#9DFF00', sides: 4 },
  d6: { accent: '#00E4FF', sides: 6 },
  d8: { accent: '#FFB800', sides: 8 },
};

const DICE_LABEL_LAYOUT: Record<DiceKind, { kindTop: number; resultTop: number }> = {
  d10: { kindTop: -24, resultTop: 84 },
  d12: { kindTop: -24, resultTop: 72 },
  d20: { kindTop: -24, resultTop: 90 },
  d4: { kindTop: -24, resultTop: 60 },
  d6: { kindTop: -24, resultTop: 72 },
  d8: { kindTop: -24, resultTop: 68 },
};

function randomRoll(kind: DiceKind) {
  return Math.floor(Math.random() * DICE_META[kind].sides) + 1;
}

function getRollingTickValue(
  kind: DiceKind,
  previousValue: number | null,
  finalValue: number
) {
  const sides = DICE_META[kind].sides;

  if (sides <= 2) {
    return previousValue === 1 ? 2 : 1;
  }

  let nextValue = randomRoll(kind);

  while (nextValue === previousValue || nextValue === finalValue) {
    nextValue = randomRoll(kind);
  }

  return nextValue;
}

export function DiceScreen({
  animationsEnabled,
  history,
  onChangeKind,
  onCommitRoll,
  onRollChosenSound,
  onRollChosenSoundWithRate,
  onRollExtremeTone,
  onSwipeSound,
  onRollTickSound,
  onRoll,
  result,
  selectedKind,
}: DiceScreenProps) {
  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  const rollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollProgress = useRef(new Animated.Value(0)).current;
  const resultPulse = useRef(new Animated.Value(1)).current;
  const screenFlash = useRef(new Animated.Value(0)).current;
  const resultBurst = useRef(new Animated.Value(0)).current;
  const swipeProgress = useRef(new Animated.Value(1)).current;
  const lastSwipeDirection = useRef<-1 | 1>(1);
  const displayedResultRef = useRef<number | null>(result);
  const [criticalFlashColor, setCriticalFlashColor] = useState(DICE_META[selectedKind].accent);
  const [criticalFlashPeak, setCriticalFlashPeak] = useState(0.24);
  const [displayedResult, setDisplayedResult] = useState<number | null>(result);
  const [isRolling, setIsRolling] = useState(false);
  const selectedIndex = DICE_SEQUENCE.indexOf(selectedKind);
  const prevKind = DICE_SEQUENCE[(selectedIndex - 1 + DICE_SEQUENCE.length) % DICE_SEQUENCE.length];
  const nextKind = DICE_SEQUENCE[(selectedIndex + 1) % DICE_SEQUENCE.length];
  const sides = DICE_META[selectedKind].sides;

  useEffect(() => {
    if (!isRolling) {
      setDisplayedResult(result);
      displayedResultRef.current = result;
    }
  }, [isRolling, result, selectedKind]);

  useEffect(() => {
    return () => {
      if (rollInterval.current) {
        clearInterval(rollInterval.current);
      }
    };
  }, []);

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
      useNativeDriver: true,
    }).start();
  }, [animationsEnabled, selectedKind, swipeProgress]);

  const rollShakeX = rollProgress.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: [0, -10, 8, -6, 4, 0],
  });
  const rollShakeY = rollProgress.interpolate({
    inputRange: [0, 0.24, 0.5, 0.74, 1],
    outputRange: [0, -14, 8, -4, 0],
  });
  const rollWobble = rollProgress.interpolate({
    inputRange: [0, 0.22, 0.48, 0.76, 1],
    outputRange: ['0deg', '-3deg', '4deg', '-2deg', '0deg'],
  });
  const rollScale = rollProgress.interpolate({
    inputRange: [0, 0.28, 0.58, 0.82, 1],
    outputRange: [1, 1.08, 0.96, 1.04, 1],
  });
  const rollLift = rollProgress.interpolate({
    inputRange: [0, 0.28, 0.58, 0.82, 1],
    outputRange: [0, -28, 16, -8, 0],
  });
  const mainDieSlideX = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [lastSwipeDirection.current * 72, 0],
  });
  const mainDieOpacity = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.44, 1],
  });
  const mainDieScale = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.76, 1],
  });
  const leftDieSlideX = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [72, 0] : [-18, 0],
  });
  const rightDieSlideX = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [18, 0] : [-72, 0],
  });
  const leftDieScale = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [1, 0.72] : [0.62, 0.72],
  });
  const rightDieScale = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [0.62, 0.72] : [1, 0.72],
  });
  const leftDieOpacity = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [0.92, 0.28] : [0.16, 0.28],
  });
  const rightDieOpacity = swipeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: lastSwipeDirection.current > 0 ? [0.16, 0.28] : [0.92, 0.28],
  });
  const screenFlashOpacity = screenFlash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, criticalFlashPeak],
  });

  function clearRollTicker() {
    if (rollInterval.current) {
      clearInterval(rollInterval.current);
      rollInterval.current = null;
    }
  }

  function showRollingNumber(nextResult: number, playTick = true) {
    displayedResultRef.current = nextResult;
    setDisplayedResult(nextResult);
    if (playTick) {
      onRollTickSound?.();
    }
    resultPulse.stopAnimation();
    resultPulse.setValue(0.78);
    Animated.spring(resultPulse, {
      toValue: 1,
      damping: 9,
      mass: 0.55,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }

  function finishRoll(finalResult: number, playFinalTick: boolean) {
    showRollingNumber(finalResult, playFinalTick);
    const isMinRoll = finalResult === 1;
    const isMaxRoll = finalResult === DICE_META[selectedKind].sides;
    const normalizedResult =
      DICE_META[selectedKind].sides <= 1
        ? 1
        : (finalResult - 1) / (DICE_META[selectedKind].sides - 1);
    const flashColor = isMaxRoll
      ? '#54FF7B'
      : isMinRoll
        ? '#FF365E'
        : DICE_META[selectedKind].accent;
    const flashPeak = isMaxRoll || isMinRoll ? 0.72 : 0.16;

    setCriticalFlashColor(flashColor);
    setCriticalFlashPeak(flashPeak);
    resultBurst.stopAnimation();
    screenFlash.stopAnimation();
    resultBurst.setValue(0);
    screenFlash.setValue(0);
    Animated.parallel([
      Animated.timing(resultBurst, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(screenFlash, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(screenFlash, {
          toValue: 0,
          duration: isMaxRoll || isMinRoll ? 520 : 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    onRollChosenSound?.();
    onRollChosenSoundWithRate?.(
      0.72 + normalizedResult * 0.72,
      isMaxRoll || isMinRoll ? 0.96 : 0.48
    );
    if (isMaxRoll) {
      onRollExtremeTone?.(1.52);
    } else if (isMinRoll) {
      onRollExtremeTone?.(0.58);
    }
    onCommitRoll();
    setIsRolling(false);
  }

  function handleRoll() {
    if (isRolling) {
      return;
    }

    setIsRolling(true);
    rollProgress.stopAnimation();
    rollProgress.setValue(0);
    clearRollTicker();

    const finalResult = onRoll();
    if (!animationsEnabled) {
      finishRoll(finalResult, false);
      return;
    }

    showRollingNumber(
      getRollingTickValue(selectedKind, displayedResultRef.current, finalResult)
    );
    rollInterval.current = setInterval(() => {
      showRollingNumber(
        getRollingTickValue(selectedKind, displayedResultRef.current, finalResult)
      );
    }, 120);

    Animated.timing(rollProgress, {
      toValue: 1,
      duration: 880,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      clearRollTicker();
      finishRoll(finalResult, true);
    });
  }

  function handleCarouselEnd(x: number, y: number) {
    const start = gestureStart.current;
    gestureStart.current = null;

    if (!start || isRolling) {
      return;
    }

    const deltaX = x - start.x;
    const deltaY = y - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > 42 && absX > absY * 1.2) {
      lastSwipeDirection.current = deltaX > 0 ? -1 : 1;
      onSwipeSound?.();
      onChangeKind(deltaX > 0 ? -1 : 1);
      return;
    }

    if (absX < 24 && absY < 24) {
      handleRoll();
    }
  }

  return (
    <View style={styles.screen}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.diceScreenFlash,
          { backgroundColor: criticalFlashColor, opacity: screenFlashOpacity },
        ]}
      />
      <Text style={styles.eyebrow}>RPG Dice Set</Text>
      <View
        onTouchEnd={(event) => {
          const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
          handleCarouselEnd(touch.pageX, touch.pageY);
        }}
        onTouchStart={(event) => {
          const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
          gestureStart.current = { x: touch.pageX, y: touch.pageY };
        }}
        style={styles.carouselWrap}
      >
        <Animated.View
          style={[
            styles.sideDie,
            styles.sideDieLeft,
            {
              opacity: leftDieOpacity,
              transform: [
                { translateX: leftDieSlideX },
                { rotate: '-12deg' },
                { scale: leftDieScale },
              ],
            },
          ]}
        >
          <DieModel kind={prevKind} muted result={null} />
        </Animated.View>

        <Animated.View
          style={[
            styles.mainDieAnimated,
            {
              opacity: mainDieOpacity,
              transform: [
                { translateX: mainDieSlideX },
                { translateY: rollLift },
                { translateX: rollShakeX },
                { translateY: rollShakeY },
                { rotate: rollWobble },
                { scale: rollScale },
                { scale: mainDieScale },
              ],
            },
          ]}
        >
          <DieModel
            accent={DICE_META[selectedKind].accent}
            burstProgress={resultBurst}
            kind={selectedKind}
            result={displayedResult}
            resultScale={resultPulse}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sideDie,
            styles.sideDieRight,
            {
              opacity: rightDieOpacity,
              transform: [
                { translateX: rightDieSlideX },
                { rotate: '12deg' },
                { scale: rightDieScale },
              ],
            },
          ]}
        >
          <DieModel kind={nextKind} muted result={null} />
        </Animated.View>
      </View>

      <Text style={styles.summaryText}>
        {selectedKind.toUpperCase()} | {sides} sides | tap to roll, swipe to change
      </Text>
      <ScrollView
        contentContainerStyle={styles.historyContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.history}
      >
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>No rolls yet</Text>
        ) : (
          history.map((entry, index) => (
            <View
              key={entry.id}
              style={[styles.historyChip, index === 0 && styles.historyChipLatest]}
            >
              <Text style={[styles.historyKind, index === 0 && styles.historyKindLatest]}>
                {entry.kind.toUpperCase()}
              </Text>
              <Text style={styles.historyValue}>{entry.result}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function DieModel({
  accent,
  burstProgress,
  kind,
  muted = false,
  result,
  resultScale,
}: DieModelProps) {
  const meta = DICE_META[kind];
  const visibleResult = result ?? meta.sides;

  return (
    <View style={[styles.dieModel, muted && styles.dieModelMuted]}>
      <View style={[styles.dieGlow, { backgroundColor: meta.accent }]} />
      <View
        style={[
          styles.dieBackplate,
          getDieShapeStyle(kind),
          { backgroundColor: `${meta.accent}24` },
        ]}
      />
      <View
        style={[
          styles.dieBody,
          getDieShapeStyle(kind),
          {
            borderColor: `${meta.accent}AA`,
            shadowColor: meta.accent,
          },
        ]}
      >
        <View style={styles.facetWeb}>
          <View style={[styles.facetLine, styles.facetLineA, { backgroundColor: meta.accent }]} />
          <View style={[styles.facetLine, styles.facetLineB, { backgroundColor: meta.accent }]} />
          <View style={[styles.facetLine, styles.facetLineC, { backgroundColor: meta.accent }]} />
          <View style={[styles.facetNode, { borderColor: meta.accent }]} />
        </View>
      </View>
      <DieLabel
        accent={accent ?? meta.accent}
        burstProgress={burstProgress}
        kind={kind}
        result={visibleResult}
        resultScale={resultScale}
      />
    </View>
  );
}

function DieLabel({
  accent,
  burstProgress,
  kind,
  result,
  resultScale,
}: {
  accent: string;
  burstProgress?: Animated.Value;
  kind: DiceKind;
  result: number;
  resultScale?: Animated.Value;
}) {
  const layout = DICE_LABEL_LAYOUT[kind];

  return (
    <View pointerEvents="none" style={styles.dieLabel}>
      <Text style={[styles.kindText, { color: accent, top: layout.kindTop }]}>
        {kind.toUpperCase()}
      </Text>
      <View style={[styles.resultSlot, { top: layout.resultTop }]}>
        {burstProgress ? (
          <View pointerEvents="none" style={styles.resultBurstAnchor}>
            <DiceResultBurst accent={accent} progress={burstProgress} />
          </View>
        ) : null}
        <Animated.Text
          style={[
            styles.resultText,
            resultScale ? { transform: [{ scale: resultScale }] } : null,
          ]}
        >
          {result}
        </Animated.Text>
      </View>
    </View>
  );
}

function DiceResultBurst({
  accent,
  progress,
}: {
  accent: string;
  progress: Animated.Value;
}) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <View pointerEvents="none" style={styles.resultBurstWrap}>
      <Animated.View
        style={[
          styles.resultBurstRing,
          {
            borderColor: accent,
            opacity: progress.interpolate({
              inputRange: [0, 0.35, 1],
              outputRange: [0, 0.72, 0],
            }),
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 3.1],
                }),
              },
            ],
          },
        ]}
      />
      {rays.map((angle, index) => (
        <Animated.View
          key={`dice-burst-${index}`}
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
                      outputRange: [0, 142],
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

function getDieShapeStyle(kind: DiceKind) {
  switch (kind) {
    case 'd4':
      return styles.dieShapeD4;
    case 'd6':
      return styles.dieShapeD6;
    case 'd8':
      return styles.dieShapeD8;
    case 'd10':
      return styles.dieShapeD10;
    case 'd12':
      return styles.dieShapeD12;
    case 'd20':
      return styles.dieShapeD20;
    default:
      return styles.dieShapeD6;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 126,
    paddingBottom: 56,
    alignItems: 'center',
  },
  diceScreenFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  eyebrow: {
    color: '#88B4D9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  carouselWrap: {
    marginTop: 22,
    width: '100%',
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainDieAnimated: {
    width: 244,
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
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
    width: 82,
    height: 82,
    marginLeft: -41,
    marginTop: -41,
    borderRadius: 999,
    borderWidth: 2,
  },
  resultBurstRay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 8,
    height: 42,
    marginLeft: -4,
    marginTop: -21,
    borderRadius: 999,
    shadowOpacity: 0.88,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  sideDie: {
    position: 'absolute',
    top: 92,
    width: 126,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.28,
    zIndex: 1,
  },
  sideDieLeft: {
    left: -10,
  },
  sideDieRight: {
    right: -10,
  },
  dieModel: {
    width: 220,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieModelMuted: {
    opacity: 0.74,
  },
  dieGlow: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 999,
    opacity: 0.2,
    transform: [{ scaleX: 1.18 }],
  },
  pyramidShadow: {
    position: 'absolute',
    top: 44,
    width: 0,
    height: 0,
    borderLeftWidth: 96,
    borderRightWidth: 96,
    borderBottomWidth: 178,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ translateX: 10 }, { translateY: 12 }],
  },
  pyramidFace: {
    position: 'absolute',
    top: 34,
    width: 0,
    height: 0,
    borderLeftWidth: 96,
    borderRightWidth: 96,
    borderBottomWidth: 186,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#08152C',
  },
  pyramidFacetA: {
    position: 'absolute',
    top: 22,
    left: -90,
    width: 0,
    height: 0,
    borderLeftWidth: 58,
    borderRightWidth: 18,
    borderBottomWidth: 142,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.92,
  },
  pyramidFacetB: {
    position: 'absolute',
    top: 22,
    left: -14,
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderRightWidth: 58,
    borderBottomWidth: 142,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.9,
  },
  pyramidRidge: {
    position: 'absolute',
    top: 42,
    left: -1,
    width: 2,
    height: 124,
    borderRadius: 999,
    opacity: 0.55,
  },
  cubeTop: {
    position: 'absolute',
    top: 38,
    left: 40,
    width: 150,
    height: 34,
    borderRadius: 12,
    transform: [{ skewX: '-34deg' }],
  },
  cubeRight: {
    position: 'absolute',
    top: 58,
    right: 28,
    width: 34,
    height: 150,
    borderRadius: 12,
    transform: [{ skewY: '-34deg' }],
  },
  cubeFace: {
    width: 154,
    height: 154,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(5, 14, 31, 0.96)',
    borderWidth: 2,
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  dieBackplate: {
    position: 'absolute',
    top: 50,
    opacity: 0.72,
    transform: [{ translateX: 12 }, { translateY: 12 }],
  },
  dieBody: {
    position: 'absolute',
    top: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(5, 14, 31, 0.98)',
    borderWidth: 2,
    shadowOpacity: 0.62,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  dieShapeD4: {
    width: 152,
    height: 142,
    borderTopLeftRadius: 86,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 86,
    transform: [{ rotate: '-45deg' }, { skewX: '-8deg' }],
  },
  dieShapeD6: {
    width: 166,
    height: 166,
    borderRadius: 24,
  },
  dieShapeD8: {
    width: 158,
    height: 158,
    borderRadius: 8,
    transform: [{ rotate: '45deg' }],
  },
  dieShapeD10: {
    width: 142,
    height: 190,
    borderTopLeftRadius: 72,
    borderTopRightRadius: 72,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    transform: [{ rotate: '0deg' }, { skewX: '-10deg' }],
  },
  dieShapeD12: {
    width: 184,
    height: 166,
    borderTopLeftRadius: 64,
    borderTopRightRadius: 42,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 64,
    transform: [{ rotate: '12deg' }],
  },
  dieShapeD20: {
    width: 154,
    height: 202,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 92,
    borderBottomLeftRadius: 92,
    borderBottomRightRadius: 28,
    transform: [{ rotate: '42deg' }],
  },
  polyBack: {
    position: 'absolute',
    opacity: 0.72,
  },
  polyFace: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(5, 14, 31, 0.98)',
    borderWidth: 2,
    shadowOpacity: 0.62,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  polyD8: {
    width: 158,
    height: 158,
    borderRadius: 18,
    transform: [{ rotate: '45deg' }],
  },
  polyD10: {
    width: 160,
    height: 184,
    borderTopLeftRadius: 64,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 64,
    transform: [{ rotate: '32deg' }],
  },
  polyD12: {
    width: 176,
    height: 176,
    borderRadius: 46,
    transform: [{ rotate: '18deg' }],
  },
  polyD20: {
    width: 168,
    height: 196,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 82,
    borderBottomLeftRadius: 82,
    borderBottomRightRadius: 28,
    transform: [{ rotate: '45deg' }],
  },
  polyBackD8: {
    width: 158,
    height: 158,
    borderRadius: 18,
    transform: [{ translateX: 12 }, { translateY: 12 }, { rotate: '45deg' }],
  },
  polyBackD10: {
    width: 160,
    height: 184,
    borderTopLeftRadius: 64,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 64,
    transform: [{ translateX: 12 }, { translateY: 12 }, { rotate: '32deg' }],
  },
  polyBackD12: {
    width: 176,
    height: 176,
    borderRadius: 46,
    transform: [{ translateX: 12 }, { translateY: 12 }, { rotate: '18deg' }],
  },
  polyBackD20: {
    width: 168,
    height: 196,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 82,
    borderBottomLeftRadius: 82,
    borderBottomRightRadius: 28,
    transform: [{ translateX: 12 }, { translateY: 12 }, { rotate: '45deg' }],
  },
  facetWeb: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  facetLine: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 2,
    height: 170,
    borderRadius: 999,
    opacity: 0.28,
  },
  facetLineA: {
    transform: [{ translateY: -85 }],
  },
  facetLineB: {
    transform: [{ translateY: -85 }, { rotate: '54deg' }],
  },
  facetLineC: {
    transform: [{ translateY: -85 }, { rotate: '-54deg' }],
  },
  facetLineD: {
    transform: [{ translateY: -85 }, { rotate: '90deg' }],
  },
  facetNode: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.34,
  },
  dieLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  kindText: {
    position: 'absolute',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3.6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255, 255, 255, 0.22)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  resultSlot: {
    position: 'absolute',
    width: 190,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBurstAnchor: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    color: '#F7FCFF',
    fontSize: 72,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  pipsWrap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  pip: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 999,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  summaryText: {
    marginTop: 2,
    color: '#9BB4CB',
    fontSize: 13,
    textAlign: 'center',
  },
  history: {
    marginTop: 20,
    maxHeight: 78,
  },
  historyContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  historyChip: {
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyChipLatest: {
    backgroundColor: 'rgba(0, 228, 255, 0.16)',
    borderColor: 'rgba(0, 228, 255, 0.44)',
  },
  historyKind: {
    color: '#83E9FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  historyKindLatest: {
    color: '#FFF4FC',
  },
  historyValue: {
    marginTop: 2,
    color: '#F4FBFF',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyHistory: {
    color: '#8099B8',
    fontSize: 14,
    paddingHorizontal: 8,
  },
});
