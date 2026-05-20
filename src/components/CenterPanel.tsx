import { type ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native';
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

type CenterTextProps = {
  children: ReactNode;
  minimumFontScale?: number;
  style: StyleProp<TextStyle>;
};

function CenterText({ children, minimumFontScale = 0.48, style }: CenterTextProps) {
  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={minimumFontScale}
      numberOfLines={1}
      style={style}
    >
      {children}
    </Text>
  );
}

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
          <CenterText style={[styles.centerEyebrow, { color: winnerColor }]}>Winner</CenterText>
          <CenterText minimumFontScale={0.36} style={[styles.centerValue, { color: winnerColor }]}>
            {winnerLabel}
          </CenterText>
          <CenterText style={styles.centerHint}>
            {activeTouches.length > 0 ? 'Release all fingers' : 'Tap to reset'}
          </CenterText>
        </>
      );
    }

    if (screen === 'players-order' && selectedOrder) {
      return (
        <>
          <CenterText style={styles.centerEyebrow}>Turn Order</CenterText>
          <CenterText minimumFontScale={0.36} style={styles.centerValue}>
            {selectedOrder.length}
          </CenterText>
          <CenterText style={styles.centerHint}>
            {activeTouches.length > 0 ? 'Release all fingers' : 'Tap to reset'}
          </CenterText>
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
            <CenterText style={styles.manualButtonText}>START</CenterText>
          </Pressable>
        );
      }

      return (
        <>
          <CenterText style={styles.centerEyebrow}>Mode</CenterText>
          <CenterText minimumFontScale={0.36} style={styles.centerValue}>
            Manual
          </CenterText>
          <CenterText minimumFontScale={0.38} style={styles.centerHint}>
            Hold 2+ fingers outside START
          </CenterText>
        </>
      );
    }

    if (activeTouches.length >= 2 && remainingMs !== null) {
      return (
        <>
          <CenterText style={styles.centerEyebrow}>Countdown</CenterText>
          <CenterText minimumFontScale={0.36} style={styles.centerValue}>
            {(remainingMs / 1000).toFixed(1)}
          </CenterText>
          <CenterText style={styles.centerHint}>Keep still to lock it in</CenterText>
        </>
      );
    }

    if (activeTouches.length === 1) {
      return (
        <>
          <CenterText style={styles.centerEyebrow}>Waiting</CenterText>
          <CenterText minimumFontScale={0.36} style={styles.centerValue}>
            1
          </CenterText>
          <CenterText style={styles.centerHint}>Need one more finger</CenterText>
        </>
      );
    }

    if (screen === 'players-order') {
      return (
        <>
          <CenterText style={styles.centerEyebrow}>Turn Order</CenterText>
          <CenterText minimumFontScale={0.36} style={styles.centerValue}>
            {getModeLabel(roundMode)}
          </CenterText>
          <CenterText minimumFontScale={0.34} style={styles.centerHint}>
            Place 2+ fingers to build the full chain
          </CenterText>
        </>
      );
    }

    return (
      <>
        <CenterText style={styles.centerEyebrow}>WhoStarts?</CenterText>
        <CenterText minimumFontScale={0.36} style={styles.centerValue}>
          {getModeLabel(roundMode)}
        </CenterText>
        <CenterText style={styles.centerHint}>Place 2+ fingers anywhere</CenterText>
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
    padding: 20,
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
    includeFontPadding: false,
    letterSpacing: 1.4,
    lineHeight: 18,
    textAlign: 'center',
    textAlignVertical: 'center',
    textTransform: 'uppercase',
    width: '100%',
  },
  centerValue: {
    marginTop: 10,
    color: '#F6FDFF',
    fontSize: 44,
    fontWeight: '800',
    includeFontPadding: false,
    letterSpacing: 1,
    lineHeight: 52,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  centerHint: {
    marginTop: 10,
    color: '#9AB2C9',
    fontSize: 14,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 18,
    width: '100%',
  },
  manualButton: {
    minWidth: 148,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 0,
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
    fontSize: 18,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 1.5,
    lineHeight: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
});
