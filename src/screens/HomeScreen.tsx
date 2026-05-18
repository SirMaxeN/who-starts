import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { CenterPanel } from '../components/CenterPanel';
import { OverlayModal } from '../components/OverlayModal';
import { SciFiBackdrop } from '../components/SciFiBackdrop';
import { SelectionEffects } from '../components/SelectionEffects';
import { TopBar } from '../components/TopBar';
import { TouchMarker } from '../components/TouchMarker';
import { MODE_OPTIONS } from '../constants/game';
import { useWhoStartsGame } from '../hooks/useWhoStartsGame';

const APP_VERSION = require('../../app.json').expo.version as string;

export function HomeScreen() {
  const { height, width } = useWindowDimensions();
  const game = useWhoStartsGame();
  const isCompactScreen = height < 760 || width < 390;
  const isDesktopWeb = Platform.OS === 'web' && width >= 768;
  const [isDesktopNoticeOpen, setIsDesktopNoticeOpen] = useState(isDesktopWeb);

  useEffect(() => {
    if (isDesktopWeb) {
      setIsDesktopNoticeOpen(true);
      return;
    }

    setIsDesktopNoticeOpen(false);
  }, [isDesktopWeb]);
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
        onTouchEndCapture={game.handleTouchEvent}
        onTouchEnd={game.handleTouchEvent}
        onTouchMove={game.handleTouchEvent}
        onTouchStart={game.handleTouchStartEvent}
        style={styles.surface}
      >
        <SciFiBackdrop animationsEnabled={game.settings.animations} />
        <SelectionEffects
          isChoosing={game.settings.animations && game.isChoosing}
          winnerBurstKey={game.winnerBurstKey}
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
          contentContainerStyle={[
            styles.settingsContent,
            isCompactScreen && styles.settingsContentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.settingsScroll}
        >
          <Text style={[styles.sectionTitle, isCompactScreen && styles.sectionTitleCompact]}>
            Experience
          </Text>
          <Pressable
            onPress={() => handleToggleSetting('sounds')}
            style={[styles.toggleRow, isCompactScreen && styles.toggleRowCompact]}
          >
            <Text style={[styles.toggleLabel, isCompactScreen && styles.toggleLabelCompact]}>
              Sounds
            </Text>
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
            style={[styles.toggleRow, isCompactScreen && styles.toggleRowCompact]}
          >
            <Text style={[styles.toggleLabel, isCompactScreen && styles.toggleLabelCompact]}>
              Music
            </Text>
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
            style={[styles.toggleRow, isCompactScreen && styles.toggleRowCompact]}
          >
            <Text style={[styles.toggleLabel, isCompactScreen && styles.toggleLabelCompact]}>
              Animations
            </Text>
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

          <Text style={[styles.sectionTitle, isCompactScreen && styles.sectionTitleCompact]}>
            Round mode
          </Text>
          <View style={[styles.optionsGrid, isCompactScreen && styles.optionsGridCompact]}>
            {MODE_OPTIONS.map((option) => {
              const isSelected = option.value === game.roundMode;

              return (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    handleSelectRoundMode(option.value);
                  }}
                  style={[
                    styles.optionButton,
                    isCompactScreen && styles.optionButtonCompact,
                    isSelected && styles.optionButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isCompactScreen && styles.optionButtonTextCompact,
                      isSelected && styles.optionButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, isCompactScreen && styles.sectionTitleCompact]}>
            Help
          </Text>
          <Text style={[styles.modalText, isCompactScreen && styles.modalTextCompact]}>
            Put 2 or more fingers on the screen.
          </Text>
          <Text style={[styles.modalText, isCompactScreen && styles.modalTextCompact]}>
            In timed modes, adding or removing fingers restarts the countdown.
          </Text>
          <Text style={[styles.modalText, isCompactScreen && styles.modalTextCompact]}>
            In manual mode, press START when everyone is ready.
          </Text>
          <Text style={[styles.modalText, isCompactScreen && styles.modalTextCompact]}>
            One finger wins. Release all fingers to begin again.
          </Text>
          <Text style={styles.creditText}>Created by SirMaxeN</Text>
          <Text style={styles.versionText}>Version {APP_VERSION}</Text>
        </ScrollView>
      </OverlayModal>

      <OverlayModal
        visible={isDesktopNoticeOpen}
        onClose={() => setIsDesktopNoticeOpen(false)}
        title="Best on phone"
      >
        <Text style={styles.modalText}>
          WhoStarts? is designed mainly for mobile devices.
        </Text>
        <Text style={styles.modalText}>
          The game works by placing multiple fingers on the screen at the same time, so desktop does not show the real experience.
        </Text>
        <Text style={styles.modalText}>
          Open this page on a phone
        </Text>
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
  modalTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    marginTop: 8,
    color: '#8FB3D8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionTitleCompact: {
    marginTop: 4,
    fontSize: 12,
  },
  optionsGrid: {
    gap: 10,
  },
  optionsGridCompact: {
    gap: 8,
  },
  settingsScroll: {
    flexGrow: 0,
  },
  settingsContent: {
    gap: 12,
    paddingBottom: 8,
  },
  settingsContentCompact: {
    gap: 10,
    paddingBottom: 4,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionButtonCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
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
  optionButtonTextCompact: {
    fontSize: 15,
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
  toggleRowCompact: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  toggleLabel: {
    color: '#E6F4FF',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleLabelCompact: {
    fontSize: 15,
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
  creditText: {
    marginTop: 10,
    color: '#8AA3BF',
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  versionText: {
    marginTop: 4,
    color: '#6D86A3',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
