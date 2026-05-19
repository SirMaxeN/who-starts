import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppScreen, RoundMode, TouchPoint } from '../types/game';
import { getModeLabel, getTouchColor } from '../utils/game';

export const CENTER_PANEL_SIZE = 232;
export const CENTER_PANEL_RADIUS = CENTER_PANEL_SIZE / 2;

type CenterPanelProps = {
  activeTouches: TouchPoint[];
  awaitingRelease?: boolean;
  isChoosing: boolean;
  playerLabels: Record<string, string>;
  remainingMs: number | null;
  roundMode: RoundMode;
  onStartManualRound: () => void;
  screen?: AppScreen;
  selectedOrder?: TouchPoint[] | null;
  winner: TouchPoint | null;
};

export function CenterPanel({
  activeTouches,
  awaitingRelease = false,
  isChoosing,
  onStartManualRound,
  playerLabels,
  remainingMs,
  roundMode,
  screen = 'first-player',
  selectedOrder = null,
  winner,
}: CenterPanelProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isChoosing && !winner) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: winner ? 420 : 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: winner ? 420 : 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();

    return () => {
      pulse.stopAnimation();
    };
  }, [isChoosing, pulse, winner]);

  const winnerColor = winner ? getTouchColor(winner.id) : '#00F5FF';
  const animatedBorderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: winner
      ? ['rgba(94, 231, 255, 0.3)', winnerColor]
      : ['rgba(94, 231, 255, 0.3)', 'rgba(255, 79, 216, 0.65)'],
  });
  const animatedShadowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, winner ? 0.55 : 0.42],
  });
  const animatedScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, winner ? 1.04 : 1.02],
  });

  function renderContent() {
    if (winner) {
      const winnerLabel = playerLabels[winner.id] ?? 'Winner';

      return (
        <>
          <Text style={[styles.centerEyebrow, { color: winnerColor }]}>Winner</Text>
          <Text style={[styles.centerValue, { color: winnerColor }]}>{winnerLabel}</Text>
          <Text style={styles.centerHint}>Release all fingers</Text>
        </>
      );
    }

    if (screen === 'players-order' && selectedOrder) {
      return (
        <>
          <Text style={styles.centerEyebrow}>Player Order</Text>
          <Text style={styles.centerValue}>{selectedOrder.length}</Text>
          <Text style={styles.centerHint}>
            {activeTouches.length > 0 ? 'Release all fingers' : 'Tap to reset'}
          </Text>
        </>
      );
    }

    if (roundMode === 'manual') {
      if (activeTouches.length >= 2) {
        return (
          <Pressable
            onPress={onStartManualRound}
            style={({ pressed }) => [
              styles.manualButton,
              pressed && styles.manualButtonPressed,
            ]}
          >
            <Text style={styles.manualButtonText}>START</Text>
          </Pressable>
        );
      }

      return (
        <>
          <Text style={styles.centerEyebrow}>Mode</Text>
          <Text style={styles.centerValue}>Manual</Text>
          <Text style={styles.centerHint}>Hold 2+ fingers outside START</Text>
        </>
      );
    }

    if (activeTouches.length >= 2 && remainingMs !== null) {
      return (
        <>
          <Text style={styles.centerEyebrow}>Countdown</Text>
          <Text style={styles.centerValue}>{(remainingMs / 1000).toFixed(1)}</Text>
          <Text style={styles.centerHint}>Keep still to lock it in</Text>
        </>
      );
    }

    if (activeTouches.length === 1) {
      return (
        <>
          <Text style={styles.centerEyebrow}>Waiting</Text>
          <Text style={styles.centerValue}>1</Text>
          <Text style={styles.centerHint}>Need one more finger</Text>
        </>
      );
    }

    if (screen === 'players-order') {
      return (
        <>
          <Text style={styles.centerEyebrow}>Players Order</Text>
          <Text style={styles.centerValue}>{getModeLabel(roundMode)}</Text>
          <Text style={styles.centerHint}>Place 2+ fingers to build the full chain</Text>
        </>
      );
    }

    return (
      <>
        <Text style={styles.centerEyebrow}>WhoStarts?</Text>
        <Text style={styles.centerValue}>{getModeLabel(roundMode)}</Text>
        <Text style={styles.centerHint}>Place 2+ fingers anywhere</Text>
      </>
    );
  }

  return (
    <Animated.View
      style={[
        styles.centerCard,
        {
          borderColor: animatedBorderColor,
          shadowColor: winnerColor,
          shadowOpacity: animatedShadowOpacity,
          transform: [
            { translateX: -CENTER_PANEL_RADIUS },
            { translateY: -CENTER_PANEL_RADIUS },
            { scale: animatedScale },
          ],
        },
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: CENTER_PANEL_SIZE,
    minHeight: CENTER_PANEL_SIZE,
    borderRadius: CENTER_PANEL_RADIUS,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 14, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(94, 231, 255, 0.3)',
    shadowColor: '#00F5FF',
    shadowOpacity: 0.24,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  centerEyebrow: {
    color: '#8FB3D8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  centerValue: {
    marginTop: 10,
    color: '#F6FDFF',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 1,
  },
  centerHint: {
    marginTop: 10,
    color: '#9AB2C9',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  manualButton: {
    minWidth: 148,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: '#00E4FF',
    shadowColor: '#00E4FF',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  manualButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  manualButtonText: {
    color: '#04131E',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
