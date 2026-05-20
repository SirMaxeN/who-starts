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
  COIN_OPTIONS,
  DICE_OPTIONS,
  MODE_OPTIONS,
  SCREEN_ORDER,
} from '../constants/game';
import { usePlayersScore } from '../hooks/usePlayersScore';
import { usePremiumAccess } from '../hooks/usePremiumAccess';
import { useWhoStartsGame } from '../hooks/useWhoStartsGame';
import { RollHistoryStorage, type CoinHistoryByMode } from '../services/RollHistoryStorage';
import { CoinModeScreen } from './modes/CoinModeScreen';
import { DiceModeScreen } from './modes/DiceModeScreen';
import { FirstPlayerModeScreen } from './modes/FirstPlayerModeScreen';
import { PlayersOrderModeScreen } from './modes/PlayersOrderModeScreen';
import { PlayersScoreModeScreen } from './modes/PlayersScoreModeScreen';
import type {
  AppScreen,
  CoinMode,
  CoinSide,
  DiceHistoryEntry,
  DiceKind,
  RoundMode,
  ScreenOption,
} from '../types/game';

const APP_VERSION = require('../../package.json').version as string;
const INITIAL_SCREEN: AppScreen = 'first-player';
const WEB_SCREENSHOT_MODE =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_WEB_SCREENSHOT_MODE === 'true';

function getCoinSides(mode: CoinMode): [CoinSide, CoinSide] {
  switch (mode) {
    case 'do-skip':
      return ['Do', 'Skip'];
    case 'heads-tails':
      return ['Heads', 'Tails'];
    case 'left-right':
      return ['Left', 'Right'];
    case 'odd-even':
      return ['Odd', 'Even'];
    case 'yes-no':
      return ['Yes', 'No'];
  }
}

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
  const [scoreboardView, setScoreboardView] = useState<'history' | 'score'>('score');
  const [diceKind, setDiceKind] = useState<DiceKind>('d6');
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([]);
  const pendingDiceResultRef = useRef<{
    id: string;
    kind: DiceKind;
    result: number;
  } | null>(null);
  const [coinResult, setCoinResult] = useState<CoinSide | null>(null);
  const [coinMode, setCoinMode] = useState<CoinMode>('heads-tails');
  const [coinHistoryByMode, setCoinHistoryByMode] = useState<CoinHistoryByMode>({
    'do-skip': [],
    'heads-tails': [],
    'left-right': [],
    'odd-even': [],
    'yes-no': [],
  });
  const pendingCoinResultRef = useRef<{
    id: string;
    mode: CoinMode;
    result: CoinSide;
  } | null>(null);
  const currentScreen = isWeb && !WEB_SCREENSHOT_MODE ? 'first-player' : mobileScreen;
  const currentScreenConfig = APP_SCREENS[currentScreen];
  const currentCoinHistory = coinHistoryByMode[coinMode];
  const isTouchScreen =
    currentScreen === 'first-player' || currentScreen === 'players-order';
  const game = useWhoStartsGame({ screen: currentScreen });
  const score = usePlayersScore();
  const premium = usePremiumAccess();
  const isDesktopWeb = isWeb && width >= 768;
  const premiumUnlocked = WEB_SCREENSHOT_MODE || (!isWeb && premium.hasPremium);

  useEffect(() => {
    if (isWeb && !WEB_SCREENSHOT_MODE) {
      setIsDesktopNoticeOpen(isDesktopWeb);
      setHasLoadedMobileScreen(true);
      return;
    }

    if (isDesktopWeb) {
      setIsDesktopNoticeOpen(true);
      return;
    }

    setIsDesktopNoticeOpen(false);
    setMobileScreen(INITIAL_SCREEN);
    setHasLoadedMobileScreen(true);
  }, [isDesktopWeb, isWeb]);

  useEffect(() => {
    if (isWeb && !WEB_SCREENSHOT_MODE) {
      return;
    }

    let isMounted = true;

    RollHistoryStorage.loadDice().then((history) => {
      if (isMounted) {
        setDiceHistory(history);
      }
    });

    RollHistoryStorage.loadCoin().then((history) => {
      if (isMounted) {
        setCoinHistoryByMode(history);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isWeb]);

  const chipLabel = useMemo(() => {
    if (currentScreen === 'first-player' || currentScreen === 'players-order') {
      return game.roundMode === 'manual' ? 'Manual' : `${game.roundMode / 1000}s`;
    }

    if (currentScreen === 'dice') {
      return diceKind.toUpperCase();
    }

    if (currentScreen === 'coin') {
      return COIN_OPTIONS.find((option) => option.value === coinMode)?.label ?? 'Coin';
    }

    if (currentScreen === 'players-score') {
      return scoreboardView === 'history' ? 'History' : 'Score';
    }

    return currentScreenConfig.chipLabel;
  }, [coinMode, currentScreen, currentScreenConfig.chipLabel, diceKind, game.roundMode, scoreboardView]);

  const contextTitle = useMemo(() => {
    if (currentScreen === 'dice') {
      return 'Dice setup';
    }

    if (currentScreen === 'players-order') {
      return 'Order setup';
    }

    if (currentScreen === 'coin') {
      return 'Coin setup';
    }

    if (currentScreen === 'first-player') {
      return 'Round mode';
    }

    if (currentScreen === 'players-score') {
      return 'Scoreboard view';
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

    if (currentScreen === 'coin') {
      return COIN_OPTIONS.map((option) => ({
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

    if (currentScreen === 'players-score') {
      return [
        { label: 'Score', value: 'score' },
        { label: 'History', value: 'history' },
      ];
    }

    return [];
  }, [currentScreen]);

  const currentContextValue = useMemo(() => {
    if (currentScreen === 'dice') {
      return diceKind;
    }

    if (currentScreen === 'coin') {
      return coinMode;
    }

    if (currentScreen === 'first-player' || currentScreen === 'players-order') {
      return String(game.roundMode);
    }

    if (currentScreen === 'players-score') {
      return scoreboardView;
    }

    return '';
  }, [coinMode, currentScreen, diceKind, game.roundMode, scoreboardView]);

  if (!hasLoadedMobileScreen) {
    return <View style={styles.app} />;
  }

  function handleTapAction(action: () => void) {
    action();
  }

  function handleToggleSetting(key: 'animations' | 'haptics' | 'music' | 'sounds') {
    game.playTapHaptic();
    game.setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleSelectRoundMode(value: (typeof MODE_OPTIONS)[number]['value']) {
    game.playTapHaptic();
    game.setRoundMode(value);
  }

  function handleManualStart() {
    game.playStartHaptic();
    game.selectWinner(game.activeTouches);
  }

  function handleSelectScreen(nextScreen: AppScreen) {
    game.playTapHaptic();

    if (APP_SCREENS[nextScreen].premium && !premiumUnlocked) {
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
    game.playStartHaptic();
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

    setDiceHistory((current) => {
      const nextHistory = [pendingEntry, ...current].slice(0, 10);
      RollHistoryStorage.saveDice(nextHistory);
      return nextHistory;
    });
    pendingDiceResultRef.current = null;
    game.playSuccessHaptic();
  }

  function handleFlipCoin() {
    game.playStartHaptic();
    const [positive, negative] = getCoinSides(coinMode);
    const result: CoinSide = Math.random() > 0.5 ? positive : negative;
    setCoinResult(result);
    pendingCoinResultRef.current = { id: `coin-${Date.now()}`, mode: coinMode, result };
    return result;
  }

  function handleCoinModeChange(direction: -1 | 1) {
    const currentIndex = COIN_OPTIONS.findIndex((option) => option.value === coinMode);
    const nextIndex =
      (currentIndex + direction + COIN_OPTIONS.length) % COIN_OPTIONS.length;
    setCoinMode(COIN_OPTIONS[nextIndex].value);
    setCoinResult(null);
  }

  function handleCommitCoinResult() {
    const pendingEntry = pendingCoinResultRef.current;

    if (!pendingEntry) {
      return;
    }

    setCoinHistoryByMode((current) => {
      const nextHistory = {
        ...current,
        [pendingEntry.mode]: [pendingEntry, ...current[pendingEntry.mode]].slice(0, 10),
      };
      RollHistoryStorage.saveCoin(nextHistory);
      return nextHistory;
    });
    pendingCoinResultRef.current = null;
    game.playSuccessHaptic();
  }

  function handleScoreSuccess() {
    game.playChosen();
    game.playSuccessHaptic();
  }

  function renderCurrentScreen() {
    if (isWeb && !WEB_SCREENSHOT_MODE) {
      return (
        <FirstPlayerModeScreen
          activeTouches={game.activeTouches}
          animationsEnabled={game.settings.animations}
          awaitingRelease={game.awaitingRelease}
          contextLabel={chipLabel}
          isChoosing={game.settings.animations && game.isChoosing}
          onLayout={game.handleSurfaceLayout}
          onOpenContext={() => handleTapAction(() => setIsContextPickerOpen(true))}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenPremium={() => undefined}
          onOpenSettings={() => handleTapAction(() => setIsSettingsOpen(true))}
          onStartManualRound={handleManualStart}
          onTouchCancel={game.handleTouchEvent}
          onTouchEnd={game.handleTouchEvent}
          onTouchEndCapture={game.handleTouchEvent}
          onTouchMove={game.handleTouchEvent}
          onTouchStart={game.handleTouchStartEvent}
          playerLabels={game.playerLabels}
          premiumUnlocked={false}
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
          onOpenContext={() => handleTapAction(() => setIsContextPickerOpen(true))}
          onOpenPremium={() => handleTapAction(() => setIsPremiumModalOpen(true))}
          onOpenSettings={() => handleTapAction(() => setIsSettingsOpen(true))}
          onStartManualRound={handleManualStart}
          onTouchCancel={game.handleTouchEvent}
          onTouchEnd={game.handleTouchEvent}
          onTouchEndCapture={game.handleTouchEvent}
          onTouchMove={game.handleTouchEvent}
          onTouchStart={game.handleTouchStartEvent}
          playerLabels={game.playerLabels}
          premiumUnlocked={premiumUnlocked}
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
          onOpenContext={() => handleTapAction(() => setIsContextPickerOpen(true))}
          onOpenPremium={() => handleTapAction(() => setIsPremiumModalOpen(true))}
          onOpenSettings={() => handleTapAction(() => setIsSettingsOpen(true))}
          onOrderRevealSound={game.playPlayerTone}
          onStartManualRound={handleManualStart}
          onTouchCancel={game.handleTouchEvent}
          onTouchEnd={game.handleTouchEvent}
          onTouchEndCapture={game.handleTouchEvent}
          onTouchMove={game.handleTouchEvent}
          onTouchStart={game.handleTouchStartEvent}
          playerLabels={game.playerLabels}
          premiumUnlocked={premiumUnlocked}
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
          onOpenContext={() => handleTapAction(() => setIsContextPickerOpen(true))}
          onOpenPremium={() => handleTapAction(() => setIsPremiumModalOpen(true))}
          onPlayChosenSound={game.playChosen}
          onPlayChosenSoundWithRate={game.playChosenWithRate}
          onPlayExtremeTone={game.playPlayerTone}
          onPlayRollTickSound={game.playPress}
          onPlaySlideSound={game.playSlide}
          onOpenSettings={() => handleTapAction(() => setIsSettingsOpen(true))}
          onRoll={handleRollDice}
          premiumUnlocked={premiumUnlocked}
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
          historyByMode={coinHistoryByMode}
          history={currentCoinHistory}
          mode={coinMode}
          onChangeMode={handleCoinModeChange}
          onCommitFlip={handleCommitCoinResult}
          onFlip={handleFlipCoin}
          onOpenContext={() => handleTapAction(() => setIsContextPickerOpen(true))}
          onPlayFlipResultSound={game.playChosenWithRate}
          onPlayFlipStartSound={game.playSlide}
          onPlayFlipTickSound={game.playPress}
          onPlayFlipTone={game.playPlayerTone}
          onPlaySlideSound={game.playSlide}
          onOpenPremium={() => handleTapAction(() => setIsPremiumModalOpen(true))}
          onOpenSettings={() => handleTapAction(() => setIsSettingsOpen(true))}
          premiumUnlocked={premiumUnlocked}
          result={coinResult}
          roundMode={game.roundMode}
        />
      );
    }

    return (
      <PlayersScoreModeScreen
        animationsEnabled={game.settings.animations}
        contextLabel={chipLabel}
        onActionHaptic={game.playTapHaptic}
        onAddEntrySuccess={handleScoreSuccess}
        onOpenPremium={() => handleTapAction(() => setIsPremiumModalOpen(true))}
        onOpenSettings={() => handleTapAction(() => setIsSettingsOpen(true))}
        onOpenViewPicker={() => handleTapAction(() => setIsContextPickerOpen(true))}
        onPlayKeypad={game.playPress}
        onPlayPlayer={game.playPlayerTone}
        onPlaySlide={game.playSlide}
        onResetHaptic={game.playStartHaptic}
        onSaveHaptic={handleScoreSuccess}
        onShowScore={() => setScoreboardView('score')}
        premiumUnlocked={premiumUnlocked}
        roundMode={game.roundMode}
        score={score}
        view={scoreboardView}
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
                    game.playTapHaptic();
                    setDiceKind(option.value);
                    setDiceResult(null);
                  }}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={1}
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

    if (currentScreen === 'coin') {
      return (
        <>
          <Text style={styles.sectionTitle}>Coin mode</Text>
          <View style={styles.optionsGrid}>
            {COIN_OPTIONS.map((option) => {
              const isSelected = option.value === coinMode;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    game.playTapHaptic();
                    setCoinMode(option.value);
                    setCoinResult(null);
                  }}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.52}
                    numberOfLines={1}
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

    if (currentScreen === 'players-score') {
      return (
        <>
          <Text style={styles.sectionTitle}>Scoreboard view</Text>
          <View style={styles.optionsGrid}>
            {[
              { label: 'Score', value: 'score' },
              { label: 'History', value: 'history' },
            ].map((option) => {
              const isSelected = option.value === scoreboardView;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    game.playTapHaptic();
                    game.playSlide();
                    setScoreboardView(option.value === 'history' ? 'history' : 'score');
                  }}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.62}
                    numberOfLines={1}
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
                game.playTapHaptic();
                if (currentScreen === 'dice') {
                  setDiceKind(option.value as DiceKind);
                  setDiceResult(null);
                } else if (currentScreen === 'coin') {
                  setCoinMode(option.value as CoinMode);
                  setCoinResult(null);
                } else if (currentScreen === 'players-score') {
                  setScoreboardView(option.value === 'history' ? 'history' : 'score');
                  game.playSlide();
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
                adjustsFontSizeToFit
                minimumFontScale={0.52}
                numberOfLines={1}
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
        alwaysBounceVertical
        contentContainerStyle={styles.settingsContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        style={styles.settingsScroll}
      >
        <Text style={styles.sectionTitle}>Experience</Text>
        {(['sounds', 'music', 'haptics', 'animations'] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => handleToggleSetting(key)}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>
              {key === 'haptics' ? 'Vibrations' : key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <View style={[styles.togglePill, game.settings[key] && styles.togglePillActive]}>
              <View
                style={[styles.toggleKnob, game.settings[key] && styles.toggleKnobActive]}
              />
            </View>
          </Pressable>
        ))}

        {renderDynamicSettingsSection()}

        {!isWeb && !premiumUnlocked ? (
          <>
            <Text style={styles.sectionTitle}>Premium</Text>
            <View style={styles.premiumSettingsCard}>
              <Text style={styles.premiumSettingsTitle}>Unlock Helper Tools</Text>
              <Text style={styles.premiumSettingsText}>
                Get Turn Order, Dice Roll, Quick Flip, and Scoreboard.
              </Text>
              <Pressable
                disabled={premium.isBusy}
                onPress={() => {
                  game.playTapHaptic();
                  void premium.buyPremium();
                }}
                style={[styles.premiumSettingsBuyButton, premium.isBusy && styles.buttonDisabled]}
              >
                <Text style={styles.premiumSettingsBuyText}>
                  {premium.status === 'purchasing'
                    ? 'Opening Google Play'
                    : premium.priceLabel
                      ? `Unlock ${premium.priceLabel}`
                      : 'Unlock Premium'}
                </Text>
              </Pressable>
              <Pressable
                disabled={premium.isBusy}
                onPress={() => {
                  game.playTapHaptic();
                  void premium.restorePremium();
                }}
                style={[styles.restoreButton, premium.isBusy && styles.buttonDisabled]}
              >
                <Text style={styles.restoreButtonText}>
                  {premium.status === 'restoring' ? 'Restoring' : 'Restore Purchase'}
                </Text>
              </Pressable>
              {premium.message ? (
                <Text style={styles.premiumStatusText}>{premium.message}</Text>
              ) : null}
            </View>
          </>
        ) : null}

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

      {isWeb && !WEB_SCREENSHOT_MODE ? (
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
            title={premiumUnlocked ? 'Choose Tool' : 'Unlock Helper Tools'}
          >
            {premiumUnlocked ? (
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
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        numberOfLines={1}
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
                <Pressable
                  disabled={premium.isBusy}
                  onPress={() => {
                    game.playTapHaptic();
                    void premium.buyPremium();
                  }}
                  style={[styles.buyButton, premium.isBusy && styles.buttonDisabled]}
                >
                  <Text style={styles.buyButtonText}>
                    {premium.status === 'purchasing'
                      ? 'Opening Google Play'
                      : premium.priceLabel
                        ? `Buy ${premium.priceLabel}`
                        : 'Buy'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={premium.isBusy}
                  onPress={() => {
                    game.playTapHaptic();
                    void premium.restorePremium();
                  }}
                  style={[styles.restoreButton, premium.isBusy && styles.buttonDisabled]}
                >
                  <Text style={styles.restoreButtonText}>
                    {premium.status === 'restoring' ? 'Restoring' : 'Restore Purchase'}
                  </Text>
                </Pressable>
                {premium.message ? (
                  <Text style={styles.premiumStatusText}>{premium.message}</Text>
                ) : null}
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
    flexGrow: 1,
    minHeight: 0,
  },
  settingsContent: {
    gap: 12,
    paddingBottom: 28,
  },
  optionButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(0, 228, 255, 0.16)',
    borderColor: 'rgba(0, 228, 255, 0.42)',
  },
  optionButtonText: {
    color: '#E6F4FF',
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 20,
    textAlign: 'center',
    textAlignVertical: 'center',
    flexShrink: 1,
    width: '100%',
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
  premiumSettingsCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 79, 216, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.24)',
    gap: 10,
  },
  premiumSettingsTitle: {
    color: '#FFF4FC',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  premiumSettingsText: {
    color: '#C9B9D2',
    fontSize: 14,
    lineHeight: 20,
  },
  premiumStatusText: {
    color: '#AFC7DD',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  premiumSettingsBuyButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 79, 216, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.42)',
  },
  premiumSettingsBuyText: {
    color: '#FFF4FC',
    fontSize: 14,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 1,
    lineHeight: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  restoreButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  restoreButtonText: {
    color: '#BFD3E8',
    fontSize: 13,
    fontWeight: '800',
    includeFontPadding: false,
    letterSpacing: 0.8,
    lineHeight: 17,
    textAlign: 'center',
    textTransform: 'uppercase',
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
  buttonDisabled: {
    opacity: 0.6,
  },
});
