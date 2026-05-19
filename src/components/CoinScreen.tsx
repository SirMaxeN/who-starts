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
import type { CoinHistoryEntry, CoinSide } from '../types/game';

type CoinScreenProps = {
  history: CoinHistoryEntry[];
  onFlip: () => CoinSide;
  result: CoinSide | null;
};

export function CoinScreen({ history, onFlip, result }: CoinScreenProps) {
  const flipProgress = useRef(new Animated.Value(0)).current;
  const flipInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayedResult, setDisplayedResult] = useState<CoinSide | null>(result);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (!isFlipping) {
      setDisplayedResult(result);
    }
  }, [isFlipping, result]);

  useEffect(() => {
    return () => {
      if (flipInterval.current) {
        clearInterval(flipInterval.current);
      }
    };
  }, []);

  const rotateY = flipProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['-14deg', '390deg', '760deg', '1120deg', '1440deg'],
  });
  const rotateX = flipProgress.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: ['12deg', '-28deg', '24deg', '12deg'],
  });
  const lift = flipProgress.interpolate({
    inputRange: [0, 0.35, 0.72, 1],
    outputRange: [0, -34, 10, 0],
  });
  const scale = flipProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 1.08, 0.84, 1.05, 1],
  });

  function clearFlipTicker() {
    if (flipInterval.current) {
      clearInterval(flipInterval.current);
      flipInterval.current = null;
    }
  }

  function handleFlip() {
    if (isFlipping) {
      return;
    }

    setIsFlipping(true);
    flipProgress.stopAnimation();
    flipProgress.setValue(0);
    clearFlipTicker();

    const finalResult = onFlip();
    let nextSide: CoinSide = 'Heads';
    setDisplayedResult(nextSide);
    flipInterval.current = setInterval(() => {
      nextSide = nextSide === 'Heads' ? 'Tails' : 'Heads';
      setDisplayedResult(nextSide);
    }, 80);

    Animated.timing(flipProgress, {
      toValue: 1,
      duration: 1040,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      clearFlipTicker();
      setDisplayedResult(finalResult);
      setIsFlipping(false);
    });
  }

  return (
    <View style={styles.screen}>
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
          <View style={styles.coinGlow} />
          <View style={styles.coinEdgeBack} />
          <View style={styles.coinEdgeMid} />
          <View style={styles.coinFace}>
            <View style={styles.coinInnerRing} />
            <View style={styles.coinOrbitA} />
            <View style={styles.coinOrbitB} />
            <Text style={styles.coinLabel}>WhoStarts?</Text>
            <Text style={styles.coinResult}>{displayedResult ?? '?'}</Text>
            <Text style={styles.coinHint}>Tap to flip</Text>
          </View>
        </Animated.View>
      </Pressable>
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
              style={[styles.historyChip, index === 0 && styles.historyChipLatest]}
            >
              <Text style={[styles.historyValue, index === 0 && styles.historyValueLatest]}>
                {entry.result}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 140,
    alignItems: 'center',
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
    backgroundColor: '#00E4FF',
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
    backgroundColor: 'rgba(255, 79, 216, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.34)',
  },
  coinEdgeMid: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 6,
    bottom: 6,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 228, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(101, 230, 255, 0.34)',
  },
  coinFace: {
    width: 226,
    height: 226,
    borderRadius: 113,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#071326',
    borderWidth: 2,
    borderColor: 'rgba(101, 230, 255, 0.58)',
    shadowColor: '#00E4FF',
    shadowOpacity: 0.42,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  coinInnerRing: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: 'rgba(0, 228, 255, 0.28)',
  },
  coinOrbitA: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.38)',
    transform: [{ rotate: '28deg' }, { scaleX: 1.36 }],
  },
  coinOrbitB: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: 'rgba(0, 228, 255, 0.42)',
    transform: [{ rotate: '-34deg' }, { scaleX: 1.48 }],
  },
  coinLabel: {
    color: '#86EFFD',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  coinResult: {
    marginTop: 14,
    color: '#F8FDFF',
    fontSize: 42,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 79, 216, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  coinHint: {
    marginTop: 10,
    color: '#91A9C1',
    fontSize: 14,
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
  historyValue: {
    color: '#F5FCFF',
    fontSize: 17,
    fontWeight: '800',
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
