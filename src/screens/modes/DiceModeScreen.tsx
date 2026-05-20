import { StyleSheet, View } from 'react-native';
import { DiceScreen } from '../../components/DiceScreen';
import { SciFiBackdrop } from '../../components/SciFiBackdrop';
import { TopBar } from '../../components/TopBar';
import type { DiceHistoryEntry, DiceKind, RoundMode } from '../../types/game';

type DiceModeScreenProps = {
  animationsEnabled: boolean;
  contextLabel: string;
  onChangeKind: (direction: -1 | 1) => void;
  onCommitRoll: () => void;
  onOpenContext: () => void;
  onOpenPremium: () => void;
  onPlayChosenSound?: () => void;
  onPlayChosenSoundWithRate?: (playbackRate: number, volume?: number) => void;
  onPlayExtremeTone?: (playbackRate: number) => void;
  onPlaySlideSound?: () => void;
  onPlayRollTickSound?: () => void;
  onOpenSettings: () => void;
  onRoll: () => number;
  premiumUnlocked?: boolean;
  result: number | null;
  roundMode: RoundMode;
  selectedKind: DiceKind;
  history: DiceHistoryEntry[];
};

export function DiceModeScreen({
  animationsEnabled,
  contextLabel,
  history,
  onChangeKind,
  onCommitRoll,
  onPlayChosenSound,
  onPlayChosenSoundWithRate,
  onPlayExtremeTone,
  onPlaySlideSound,
  onOpenContext,
  onOpenPremium,
  onPlayRollTickSound,
  onOpenSettings,
  onRoll,
  premiumUnlocked = false,
  result,
  roundMode,
  selectedKind,
}: DiceModeScreenProps) {
  return (
    <View style={styles.surface}>
      <SciFiBackdrop animationsEnabled={animationsEnabled} />
      <DiceScreen
        animationsEnabled={animationsEnabled}
        history={history}
        onChangeKind={onChangeKind}
        onCommitRoll={onCommitRoll}
        onRollChosenSound={onPlayChosenSound}
        onRollChosenSoundWithRate={onPlayChosenSoundWithRate}
        onRollExtremeTone={onPlayExtremeTone}
        onSwipeSound={onPlaySlideSound}
        onRollTickSound={onPlayRollTickSound}
        onRoll={onRoll}
        result={result}
        selectedKind={selectedKind}
      />
      <TopBar
        contextLabel={contextLabel}
        onOpenModePicker={onOpenContext}
        onOpenPremium={onOpenPremium}
        onOpenSettings={onOpenSettings}
        premiumUnlocked={premiumUnlocked}
        roundMode={roundMode}
        showPremiumButton
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
