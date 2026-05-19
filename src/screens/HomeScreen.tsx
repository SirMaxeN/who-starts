import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { OverlayModal } from '../components/OverlayModal';
import { TopBar } from '../components/TopBar';
import {
  APP_SCREENS,
  DICE_OPTIONS,
  MODE_OPTIONS,
  PREMIUM_UNLOCKED,
  SCREEN_ORDER,
} from '../constants/game';
import { usePlayersScore } from '../hooks/usePlayersScore';
import { useWhoStartsGame } from '../hooks/useWhoStartsGame';
import { ActiveScreenStorage } from '../services/ActiveScreenStorage';
import { CoinModeScreen } from './modes/CoinModeScreen';
import { DiceModeScreen } from './modes/DiceModeScreen';
import { FirstPlayerModeScreen } from './modes/FirstPlayerModeScreen';
import { PlayersOrderModeScreen } from './modes/PlayersOrderModeScreen';
import { PlayersScoreModeScreen } from './modes/PlayersScoreModeScreen';
import type {
  AppScreen,
  CoinSide,
  DiceHistoryEntry,
  DiceKind,
  RoundMode,
  ScreenOption,
} from '../types/game';

const APP_VERSION = require('../../app.json').expo.version as string;
const INITIAL_SCREEN: AppScreen = 'first-player';

export function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const [mobileScreen, setMobileScreen] = useState<AppScreen>(INITIAL_SCREEN);
  const [hasLoadedMobileScreen, setHasLoadedMobileScreen] = useState(isWeb);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDesktopNoticeOpen, setIsDesktopNoticeOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [diceKind, setDiceKind] = useState<DiceKind>('d6');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([]);
  const pendingDiceResultRef = useRef<{
    id: string;
    kind: DiceKind;
    result: number;
  } | null>(null);
  const [coinResult, setCoinResult] = useState<CoinSide | null>(null);
  const [coinHistory, setCoinHistory] = useState<Array<{ id: string; result: CoinSide }>>([]);
  const currentScreen = isWeb ? 'first-player' : mobileScreen;
  const currentScreenConfig = APP_SCREENS[currentScreen];
  const isTouchScreen =
    currentScreen === 'first-player' || currentScreen === 'players-order';
  const game = useWhoStartsGame({ screen: currentScreen });
  const score = usePlayersScore();
  const isDesktopWeb = isWeb && width >= 768;

  useEffect(() => {
    if (isWeb) {
      setIsDesktopNoticeOpen(isDesktopWeb);
      setHasLoadedMobileScreen(true);
      return;
    }

    if (isDesktopWeb) {
      setIsDesktopNoticeOpen(true);
      return;
    }

    setIsDesktopNoticeOpen(false);
    let isMounted = true;
    ActiveScreenStorage.load(INITIAL_SCREEN).then((screen) => {
      if (!isMounted) {
        return;
      }

      setMobileScreen(PREMIUM_UNLOCKED || screen === 'first-player' ? screen : 'first-player');
      setHasLoadedMobileScreen(true);
    });

    return () => {
      isMounted = false;
    };
  }, [isDesktopWeb, isWeb]);

  useEffect(() => {
    if (isWeb || !hasLoadedMobileScreen) {
      return;
    }

    if (!PREMIUM_UNLOCKED && mobileScreen !== 'first-player') {
      setMobileScreen('first-player');
      return;
    }

    ActiveScreenStorage.save(mobileScreen);
  }, [hasLoadedMobileScreen, isWeb, mobileScreen]);

  const chipLabel = useMemo(() => {
    if (currentScreen === 'first-player' || currentScreen === 'players-order') {
      return game.roundMode === 'manual' ? 'Manual' : `${game.roundMode / 1000}s`;
    }

    if (currentScreen === 'dice') {
      return diceKind.toUpperCase();
    }

    return currentScreenConfig.chipLabel;
  }, [currentScreen, currentScreenConfig.chipLabel, diceKind, game.roundMode]);

  const contextTitle = useMemo(() => {
    if (currentScreen === 'dice') {
      return 'Dice setup';
    }

    if (currentScreen === 'players-order') {
      return 'Order setup';
    }

    if (currentScreen === 'first-player') {
      return 'Round mode';
    }

    return currentScreenConfig.title;
  }, [currentScreen, currentScreenConfig.title]);

  const contextOptions = useMemo((): ScreenOption[] => {
    if (currentScreen === 'dice') {
      return DICE_OPTIONS.map((option) => ({
        label: option.label,
        value: option.value,
      }));
    }

    if (currentScreen === 'first-player' || currentScreen === 'players-order') {
      return MODE_OPTIONS.map((option) => ({
        label: option.label,
        value: String(option.value),
      }));
    }

    return [];
  }, [currentScreen]);

  const currentContextValue = useMemo(() => {
    if (currentScreen === 'dice') {
      return diceKind;
    }

    if (currentScreen === 'first-player' || currentScreen === 'players-order') {
      return String(game.roundMode);
    }

    return '';
  }, [currentScreen, diceKind, game.roundMode]);

  if (!hasLoadedMobileScreen) {
    return <View style={styles.app} />;
  }

  function handleToggleSetting(key: 'animations' | 'music' | 'sounds') {
    game.setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleSelectRoundMode(value: (typeof MODE_OPTIONS)[number]['value']) {
    game.setRoundMode(value);
  }

  function handleManualStart() {
    game.selectWinner(game.activeTouches);
  }

  function handleSelectScreen(nextScreen: AppScreen) {
    if (APP_SCREENS[nextScreen].premium && !PREMIUM_UNLOCKED) {
      setIsPremiumModalOpen(true);
      return;
    }

    setMobileScreen(nextScreen);
    setIsPremiumModalOpen(false);
  }

  function handleDiceKindChange(direction: -1 | 1) {
    const currentIndex = DICE_OPTIONS.findIndex((option) => option.value === diceKind);
    const nextIndex =
      (currentIndex + direction + DICE_OPTIONS.length) % DICE_OPTIONS.length;
    setDiceKind(DICE_OPTIONS[nextIndex].value);
    setDiceResult(null);
  }

  function handleRollDice() {
    const sides = Number(diceKind.slice(1));
    const result = Math.floor(Math.random() * sides) + 1;
    setDiceResult(result);
    pendingDiceResultRef.current = {
      id: `dice-${Date.now()}`,
      kind: diceKind,
      result,
    };
    return result;
  }

  function handleCommitDiceResult() {
    const pendingEntry = pendingDiceResultRef.current;

    if (!pendingEntry) {
      return;
    }

    setDiceHistory((current) => [pendingEntry, ...current].slice(0, 8));
    pendingDiceResultRef.current = null;
  }

  function handleFlipCoin() {
    const result: CoinSide = Math.random() > 0.5 ? 'Heads' : 'Tails';
    setCoinResult(result);
    setCoinHistory((current) =>
      [{ id: `coin-${Date.now()}`, result }, ...current].slice(0, 8)
    );
    return result;
  }

  function renderCurrentScreen() {
    if (isWeb) {
      return (
        <FirstPlayerModeScreen
          activeTouches={game.activeTouches}
          animationsEnabled={game.settings.animations}
          awaitingRelease={game.awaitingRelease}
          contextLabel={chipLabel}
          isChoosing={game.settings.animations && game.isChoosing}
          onLayout={game.handleSurfaceLayout}
          onOpenContext={() => setIsContextPickerOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenPremium={() => undefined}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStartManualRound={handleManualStart}
          onTouchCancel={game.handleTouchEvent}
          onTouchEnd={game.handleTouchEvent}
          onTouchEndCapture={game.handleTouchEvent}
          onTouchMove={game.handleTouchEvent}
          onTouchStart={game.handleTouchStartEvent}
          playerLabels={game.playerLabels}
          remainingMs={game.remainingMs}
          roundMode={game.roundMode}
          showPremiumButton={false}
          surfaceSize={game.surfaceSize}
          visibleTouches={game.visibleTouches}
          winner={game.winner}
          winnerBurstKey={game.winnerBurstKey}
        />
      );
    }

    if (currentScreen === 'first-player') {
      return (
        <FirstPlayerModeScreen
          activeTouches={game.activeTouches}
          animationsEnabled={game.settings.animations}
          awaitingRelease={game.awaitingRelease}
          contextLabel={chipLabel}
          isChoosing={game.settings.animations && game.isChoosing}
          onLayout={game.handleSurfaceLayout}
          onOpenContext={() => setIsContextPickerOpen(true)}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStartManualRound={handleManualStart}
          onTouchCancel={game.handleTouchEvent}
          onTouchEnd={game.handleTouchEvent}
          onTouchEndCapture={game.handleTouchEvent}
          onTouchMove={game.handleTouchEvent}
          onTouchStart={game.handleTouchStartEvent}
          playerLabels={game.playerLabels}
          remainingMs={game.remainingMs}
          roundMode={game.roundMode}
          surfaceSize={game.surfaceSize}
          visibleTouches={game.visibleTouches}
          winner={game.winner}
          winnerBurstKey={game.winnerBurstKey}
        />
      );
    }

    if (currentScreen === 'players-order') {
      return (
        <PlayersOrderModeScreen
          activeTouches={game.activeTouches}
          animationsEnabled={game.settings.animations}
          awaitingRelease={game.awaitingRelease}
          contextLabel={chipLabel}
          isChoosing={game.settings.animations && game.isChoosing}
          onLayout={game.handleSurfaceLayout}
          onOpenContext={() => setIsContextPickerOpen(true)}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOrderRevealSound={game.playPlayerTone}
          onStartManualRound={handleManualStart}
          onTouchCancel={game.handleTouchEvent}
          onTouchEnd={game.handleTouchEvent}
          onTouchEndCapture={game.handleTouchEvent}
          onTouchMove={game.handleTouchEvent}
          onTouchStart={game.handleTouchStartEvent}
          playerLabels={game.playerLabels}
          remainingMs={game.remainingMs}
          roundMode={game.roundMode}
          selectedOrder={game.selectedOrder}
          showOrderList
          surfaceSize={game.surfaceSize}
          visibleTouches={game.visibleTouches}
          winner={game.winner}
          winnerBurstKey={game.winnerBurstKey}
        />
      );
    }

    if (currentScreen === 'dice') {
      return (
        <DiceModeScreen
          animationsEnabled={game.settings.animations}
          contextLabel={chipLabel}
          history={diceHistory}
          onChangeKind={handleDiceKindChange}
          onCommitRoll={handleCommitDiceResult}
          onOpenContext={() => setIsContextPickerOpen(true)}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onPlayChosenSound={game.playChosen}
          onPlayChosenSoundWithRate={game.playChosenWithRate}
          onPlayExtremeTone={game.playPlayerTone}
          onPlayRollTickSound={game.playPress}
          onPlaySlideSound={game.playSlide}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRoll={handleRollDice}
          result={diceResult}
          roundMode={game.roundMode}
          selectedKind={diceKind}
        />
      );
    }

    if (currentScreen === 'coin') {
      return (
        <CoinModeScreen
          animationsEnabled={game.settings.animations}
          contextLabel={chipLabel}
          history={coinHistory}
          onFlip={handleFlipCoin}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          result={coinResult}
          roundMode={game.roundMode}
        />
      );
    }

    return (
      <PlayersScoreModeScreen
        animationsEnabled={game.settings.animations}
        contextLabel={chipLabel}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        roundMode={game.roundMode}
        score={score}
      />
    );
  }

  function renderDynamicSettingsSection() {
    if (currentScreen === 'dice') {
      return (
        <>
          <Text style={styles.sectionTitle}>Dice set</Text>
          <View style={styles.optionsGrid}>
            {DICE_OPTIONS.map((option) => {
              const isSelected = option.value === diceKind;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setDiceKind(option.value);
                    setDiceResult(null);
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
        </>
      );
    }

    if (currentScreen === 'first-player' || currentScreen === 'players-order') {
      return (
        <>
          <Text style={styles.sectionTitle}>
            {currentScreen === 'first-player' ? 'Round mode' : 'Order mode'}
          </Text>
          <View style={styles.optionsGrid}>
            {MODE_OPTIONS.map((option) => {
              const isSelected = option.value === game.roundMode;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => handleSelectRoundMode(option.value)}
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
        </>
      );
    }

    return null;
  }

  function renderContextModalBody() {
    if (contextOptions.length === 0) {
      return (
        <Text style={styles.modalText}>
          This screen does not have extra quick options yet.
        </Text>
      );
    }

    return (
      <View style={styles.optionsGrid}>
        {contextOptions.map((option) => {
          const isSelected = option.value === currentContextValue;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                if (currentScreen === 'dice') {
                  setDiceKind(option.value as DiceKind);
                  setDiceResult(null);
                } else {
                  const nextMode: RoundMode =
                    option.value === 'manual'
                      ? 'manual'
                      : (Number(option.value) as RoundMode);
                  handleSelectRoundMode(nextMode);
                }
                setIsContextPickerOpen(false);
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
    );
  }

  function renderSettingsContent() {
    return (
      <ScrollView
        contentContainerStyle={styles.settingsContent}
        showsVerticalScrollIndicator={false}
        style={styles.settingsScroll}
      >
        <Text style={styles.sectionTitle}>Experience</Text>
        {(['sounds', 'music', 'animations'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => handleToggleSetting(key)}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <View style={[styles.togglePill, game.settings[key] && styles.togglePillActive]}>
              <View
                style={[styles.toggleKnob, game.settings[key] && styles.toggleKnobActive]}
              />
            </View>
          </Pressable>
        ))}

        {renderDynamicSettingsSection()}

        <Text style={styles.sectionTitle}>Help</Text>
        {currentScreenConfig.helpLines.map((line) => (
          <Text key={line} style={styles.modalText}>
            {line}
          </Text>
        ))}
        <Text style={styles.creditText}>Created by SirMaxeN</Text>
        <Text style={styles.versionText}>Version {APP_VERSION}</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      {renderCurrentScreen()}

      {isWeb ? (
        <>
          <OverlayModal
            visible={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            onTouchStart={game.handleUiTouchStart}
            title="How it works"
          >
            {APP_SCREENS['first-player'].helpLines.map((line) => (
              <Text key={line} style={styles.modalText}>
                {line}
              </Text>
            ))}
          </OverlayModal>

          <OverlayModal
            visible={isContextPickerOpen}
            onClose={() => setIsContextPickerOpen(false)}
            onTouchStart={game.handleUiTouchStart}
            title={contextTitle}
          >
            {renderContextModalBody()}
          </OverlayModal>

          <OverlayModal
            visible={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onTouchStart={game.handleUiTouchStart}
            title="Settings"
          >
            {renderSettingsContent()}
          </OverlayModal>
        </>
      ) : (
        <>
          <OverlayModal
            visible={isPremiumModalOpen}
            onClose={() => setIsPremiumModalOpen(false)}
            onTouchStart={isTouchScreen ? game.handleUiTouchStart : undefined}
            title={PREMIUM_UNLOCKED ? 'Choose screen' : 'Premium'}
          >
            {PREMIUM_UNLOCKED ? (
              <View style={styles.optionsGrid}>
                {SCREEN_ORDER.map((screen) => {
                  const isSelected = currentScreen === screen;
                  return (
                    <Pressable
                      key={screen}
                      onPress={() => handleSelectScreen(screen)}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          isSelected && styles.optionButtonTextSelected,
                        ]}
                      >
                        {APP_SCREENS[screen].title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <Text style={styles.modalText}>Premium unlocks the extra helper screens.</Text>
                {SCREEN_ORDER.filter((screen) => APP_SCREENS[screen].premium).map((screen) => (
                  <Text key={screen} style={styles.modalText}>
                    {APP_SCREENS[screen].title}
                  </Text>
                ))}
                <Pressable style={styles.buyButton}>
                  <Text style={styles.buyButtonText}>Buy</Text>
                </Pressable>
              </>
            )}
          </OverlayModal>

          <OverlayModal
            visible={isContextPickerOpen}
            onClose={() => setIsContextPickerOpen(false)}
            onTouchStart={isTouchScreen ? game.handleUiTouchStart : undefined}
            title={contextTitle}
          >
            {renderContextModalBody()}
          </OverlayModal>

          <OverlayModal
            visible={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onTouchStart={isTouchScreen ? game.handleUiTouchStart : undefined}
            title="Settings"
          >
            {renderSettingsContent()}
          </OverlayModal>
        </>
      )}

      <OverlayModal
        visible={isDesktopNoticeOpen}
        onClose={() => setIsDesktopNoticeOpen(false)}
        title="Best on phone"
      >
        <Text style={styles.modalText}>WhoStarts? is designed mainly for mobile devices.</Text>
        <Text style={styles.modalText}>
          The game works by placing multiple fingers on the screen at the same time, so desktop does not show the real experience.
        </Text>
        <Text style={styles.modalText}>Open this page on a phone</Text>
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
  settingsScroll: {
    flexGrow: 0,
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
    textAlign: 'center',
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
  buyButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 79, 216, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.32)',
  },
  buyButtonText: {
    color: '#FFF4FC',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
