import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BACKGROUND_ORBS, MODE_OPTIONS } from '../constants/game';
import { CenterPanel } from '../components/CenterPanel';
import { OverlayModal } from '../components/OverlayModal';
import { TopBar } from '../components/TopBar';
import { TouchMarker } from '../components/TouchMarker';
import { useWhoStartsGame } from '../hooks/useWhoStartsGame';
import { extractTouches } from '../utils/touches';

export function HomeScreen() {
  const game = useWhoStartsGame();

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <View
        onLayout={game.handleSurfaceLayout}
        onMoveShouldSetResponderCapture={() => true}
        onStartShouldSetResponderCapture={() => true}
        onResponderGrant={(event) => game.setActiveTouches(extractTouches(event))}
        onResponderMove={(event) => game.setActiveTouches(extractTouches(event))}
        onResponderRelease={(event) => game.setActiveTouches(extractTouches(event))}
        onResponderTerminate={(event) => game.setActiveTouches(extractTouches(event))}
        style={styles.surface}
      >
        <View style={styles.backgroundGlowTop} pointerEvents="none" />
        <View style={styles.backgroundGlowBottom} pointerEvents="none" />

        {BACKGROUND_ORBS.map((orb, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.backgroundOrb,
              {
                top: orb.top,
                right: orb.right,
                bottom: orb.bottom,
                left: orb.left,
                width: orb.size,
                height: orb.size,
                opacity: orb.opacity,
              },
            ]}
          />
        ))}

        <View pointerEvents="none" style={styles.grid} />

        {game.visibleTouches.map((touch) => (
          <TouchMarker key={touch.id} surfaceSize={game.surfaceSize} touch={touch} />
        ))}

        <TopBar
          onOpenHelp={game.openHelp}
          onOpenSettings={game.openSettings}
          roundMode={game.roundMode}
        />

        <CenterPanel
          activeTouches={game.activeTouches}
          onStartManualRound={() => game.selectWinner(game.activeTouches)}
          remainingMs={game.remainingMs}
          roundMode={game.roundMode}
          winner={game.winner}
        />

        <Text pointerEvents="none" style={styles.footerHint}>
          {game.awaitingRelease
            ? 'Release to reset'
            : `${game.activeTouches.length} active`}
        </Text>
      </View>

      <OverlayModal visible={game.isHelpOpen} onClose={game.closeHelp} title="How it works">
        <Text style={styles.modalText}>Put 2 or more fingers on the screen.</Text>
        <Text style={styles.modalText}>In timed modes, any touch change restarts the countdown.</Text>
        <Text style={styles.modalText}>In manual mode, press START when everyone is ready.</Text>
        <Text style={styles.modalText}>One finger wins. Release all fingers to begin again.</Text>
      </OverlayModal>

      <OverlayModal
        visible={game.isSettingsOpen}
        onClose={game.closeSettings}
        title="Round mode"
      >
        {MODE_OPTIONS.map((option) => {
          const isSelected = option.value === game.roundMode;

          return (
            <Pressable
              key={option.label}
              onPress={() => {
                game.setRoundMode(option.value);
                game.closeSettings();
              }}
              style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  isSelected && styles.optionButtonTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </OverlayModal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#02030A',
  },
  surface: {
    flex: 1,
    backgroundColor: '#02030A',
    overflow: 'hidden',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -180,
    left: -40,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(0, 240, 255, 0.16)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    right: -80,
    bottom: -180,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(255, 79, 216, 0.14)',
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#0E1630',
    borderWidth: 1,
    borderColor: 'rgba(123, 164, 255, 0.1)',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.24,
    backgroundColor: '#02030A',
    borderColor: 'rgba(99, 145, 255, 0.08)',
    borderWidth: 1,
  },
  footerHint: {
    position: 'absolute',
    bottom: Platform.select({ web: 18, default: 34 }),
    alignSelf: 'center',
    color: '#8099B8',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  modalText: {
    color: '#AFC7DD',
    fontSize: 15,
    lineHeight: 22,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(0, 228, 255, 0.16)',
    borderColor: 'rgba(0, 228, 255, 0.42)',
  },
  optionButtonText: {
    color: '#E6F4FF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionButtonTextSelected: {
    color: '#8AF4FF',
  },
});
