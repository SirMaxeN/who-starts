import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoundMode, TouchPoint } from '../types/game';
import { getModeLabel, getTouchColor } from '../utils/game';

export const CENTER_PANEL_SIZE = 232;
export const CENTER_PANEL_RADIUS = CENTER_PANEL_SIZE / 2;

type CenterPanelProps = {
  activeTouches: TouchPoint[];
  playerLabels: Record<string, string>;
  remainingMs: number | null;
  roundMode: RoundMode;
  onStartManualRound: () => void;
  winner: TouchPoint | null;
};

export function CenterPanel({
  activeTouches,
  onStartManualRound,
  playerLabels,
  remainingMs,
  roundMode,
  winner,
}: CenterPanelProps) {
  function renderContent() {
    if (winner) {
      const winnerColor = getTouchColor(winner.id);
      const winnerLabel = playerLabels[winner.id] ?? 'Winner';

      return (
        <>
          <Text style={[styles.centerEyebrow, { color: winnerColor }]}>Winner</Text>
          <Text style={[styles.centerValue, { color: winnerColor }]}>{winnerLabel}</Text>
          <Text style={styles.centerHint}>Release all fingers</Text>
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
          <Text style={styles.centerHint}>Need 2+ fingers</Text>
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

    return (
      <>
        <Text style={styles.centerEyebrow}>WhoStarts?</Text>
        <Text style={styles.centerValue}>{getModeLabel(roundMode)}</Text>
        <Text style={styles.centerHint}>Place 2+ fingers to begin</Text>
      </>
    );
  }

  return <View style={styles.centerCard}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  centerCard: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: CENTER_PANEL_SIZE,
    minHeight: CENTER_PANEL_SIZE,
    transform: [
      { translateX: -CENTER_PANEL_RADIUS },
      { translateY: -CENTER_PANEL_RADIUS },
    ],
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
