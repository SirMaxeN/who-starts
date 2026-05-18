import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CenterPanel } from '../components/CenterPanel';
import { OverlayModal } from '../components/OverlayModal';
import { SciFiBackdrop } from '../components/SciFiBackdrop';
import { SelectionEffects } from '../components/SelectionEffects';
import { TopBar } from '../components/TopBar';
import { TouchMarker } from '../components/TouchMarker';
import { MODE_OPTIONS } from '../constants/game';
import { useWhoStartsGame } from '../hooks/useWhoStartsGame';

export function HomeScreen() {
  const game = useWhoStartsGame();
  const handleManualStart = () => {
    game.selectWinner(game.activeTouches);
  };

  const handleToggleSetting = (key: 'animations' | 'music' | 'sounds') => {
    game.setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleSelectRoundMode = (value: (typeof MODE_OPTIONS)[number]['value']) => {
    game.setRoundMode(value);
  };

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <View
        onLayout={game.handleSurfaceLayout}
        onTouchCancel={game.handleTouchEvent}
        onTouchEnd={game.handleTouchEvent}
        onTouchMove={game.handleTouchEvent}
        onTouchStart={game.handleTouchStartEvent}
        style={styles.surface}
      >
        <SciFiBackdrop animationsEnabled={game.settings.animations} />
        <SelectionEffects
          isChoosing={game.settings.animations && game.isChoosing}
          winner={game.settings.animations ? game.winner : null}
        />

        {game.visibleTouches.map((touch) => (
          <TouchMarker
            animationsEnabled={game.settings.animations}
            isChoosing={game.settings.animations && game.isChoosing}
            key={touch.id}
            label={game.playerLabels[touch.id] ?? 'Player'}
            surfaceSize={game.surfaceSize}
            touch={touch}
            winnerId={game.winner?.id}
          />
        ))}

        <TopBar
          onOpenHelp={game.openHelp}
          onOpenModePicker={game.openRoundMode}
          onOpenSettings={game.openSettings}
          roundMode={game.roundMode}
        />

        <CenterPanel
          activeTouches={game.activeTouches}
          isChoosing={game.settings.animations && game.isChoosing}
          onStartManualRound={handleManualStart}
          playerLabels={game.playerLabels}
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

      <OverlayModal
        visible={game.isHelpOpen}
        onClose={game.closeHelp}
        onTouchStart={game.handleUiTouchStart}
        title="How it works"
      >
        <Text style={styles.modalText}>Put 2 or more fingers on the screen.</Text>
        <Text style={styles.modalText}>In timed modes, adding or removing fingers restarts the countdown.</Text>
        <Text style={styles.modalText}>In manual mode, press START when everyone is ready.</Text>
        <Text style={styles.modalText}>One finger wins. Release all fingers to begin again.</Text>
      </OverlayModal>

      <OverlayModal
        visible={game.isRoundModeOpen}
        onClose={game.closeRoundMode}
        onTouchStart={game.handleUiTouchStart}
        title="Round mode"
      >
        <View style={styles.optionsGrid}>
          {MODE_OPTIONS.map((option) => {
            const isSelected = option.value === game.roundMode;

            return (
              <Pressable
                key={option.label}
                onPress={() => {
                  handleSelectRoundMode(option.value);
                  game.closeRoundMode();
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
        </View>
      </OverlayModal>

      <OverlayModal
        visible={game.isSettingsOpen}
        onClose={game.closeSettings}
        onTouchStart={game.handleUiTouchStart}
        title="Settings"
      >
        <ScrollView
          contentContainerStyle={styles.settingsContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Experience</Text>
          <Pressable
            onPress={() => handleToggleSetting('sounds')}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>Sounds</Text>
            <View
              style={[
                styles.togglePill,
                game.settings.sounds && styles.togglePillActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  game.settings.sounds && styles.toggleKnobActive,
                ]}
              />
            </View>
          </Pressable>
          <Pressable
            onPress={() => handleToggleSetting('music')}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>Music</Text>
            <View
              style={[
                styles.togglePill,
                game.settings.music && styles.togglePillActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  game.settings.music && styles.toggleKnobActive,
                ]}
              />
            </View>
          </Pressable>
          <Pressable
            onPress={() => handleToggleSetting('animations')}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>Animations</Text>
            <View
              style={[
                styles.togglePill,
                game.settings.animations && styles.togglePillActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  game.settings.animations && styles.toggleKnobActive,
                ]}
              />
            </View>
          </Pressable>

          <Text style={styles.sectionTitle}>Round mode</Text>
          <View style={styles.optionsGrid}>
            {MODE_OPTIONS.map((option) => {
              const isSelected = option.value === game.roundMode;

              return (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    handleSelectRoundMode(option.value);
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
          </View>

          <Text style={styles.sectionTitle}>Help</Text>
          <Text style={styles.modalText}>Put 2 or more fingers on the screen.</Text>
          <Text style={styles.modalText}>In timed modes, adding or removing fingers restarts the countdown.</Text>
          <Text style={styles.modalText}>In manual mode, press START when everyone is ready.</Text>
          <Text style={styles.modalText}>One finger wins. Release all fingers to begin again.</Text>
        </ScrollView>
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
  sectionTitle: {
    marginTop: 8,
    color: '#8FB3D8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  optionsGrid: {
    gap: 10,
  },
  settingsContent: {
    gap: 12,
    paddingBottom: 8,
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
  toggleRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: '#E6F4FF',
    fontSize: 16,
    fontWeight: '700',
  },
  togglePill: {
    width: 52,
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(120, 140, 170, 0.28)',
    justifyContent: 'center',
  },
  togglePillActive: {
    backgroundColor: 'rgba(0, 228, 255, 0.28)',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D9E8F5',
  },
  toggleKnobActive: {
    backgroundColor: '#8AF4FF',
    alignSelf: 'flex-end',
  },
});
