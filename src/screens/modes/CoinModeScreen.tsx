import { StyleSheet, View } from 'react-native';
import { CoinScreen } from '../../components/CoinScreen';
import { SciFiBackdrop } from '../../components/SciFiBackdrop';
import { TopBar } from '../../components/TopBar';
import type { CoinHistoryEntry, CoinMode, CoinSide, RoundMode } from '../../types/game';

type CoinModeScreenProps = {
  animationsEnabled: boolean;
  contextLabel: string;
  history: CoinHistoryEntry[];
  mode: CoinMode;
  onCommitFlip: () => void;
  onFlip: () => CoinSide;
  onOpenContext: () => void;
  onPlayFlipResultSound?: (playbackRate?: number, volume?: number) => void;
  onPlayFlipStartSound?: () => void;
  onPlayFlipTickSound?: () => void;
  onPlayFlipTone?: (playbackRate: number) => void;
  onOpenPremium: () => void;
  onOpenSettings: () => void;
  result: CoinSide | null;
  roundMode: RoundMode;
};

export function CoinModeScreen({
  animationsEnabled,
  contextLabel,
  history,
  mode,
  onCommitFlip,
  onFlip,
  onOpenContext,
  onPlayFlipResultSound,
  onPlayFlipStartSound,
  onPlayFlipTickSound,
  onPlayFlipTone,
  onOpenPremium,
  onOpenSettings,
  result,
  roundMode,
}: CoinModeScreenProps) {
  return (
    <View style={styles.surface}>
      <SciFiBackdrop animationsEnabled={animationsEnabled} />
      <TopBar
        contextLabel={contextLabel}
        onOpenModePicker={onOpenContext}
        onOpenPremium={onOpenPremium}
        onOpenSettings={onOpenSettings}
        roundMode={roundMode}
        showPremiumButton
      />
      <CoinScreen
        animationsEnabled={animationsEnabled}
        history={history}
        mode={mode}
        onCommitFlip={onCommitFlip}
        onFlip={onFlip}
        onFlipResultSound={onPlayFlipResultSound}
        onFlipStartSound={onPlayFlipStartSound}
        onFlipTickSound={onPlayFlipTickSound}
        onFlipTone={onPlayFlipTone}
        result={result}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: '#02030A',
    overflow: 'hidden',
  },
});
