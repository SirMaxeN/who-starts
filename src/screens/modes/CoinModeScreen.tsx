import { StyleSheet, View } from 'react-native';
import { CoinScreen } from '../../components/CoinScreen';
import { SciFiBackdrop } from '../../components/SciFiBackdrop';
import { TopBar } from '../../components/TopBar';
import type { CoinHistoryEntry, CoinSide, RoundMode } from '../../types/game';

type CoinModeScreenProps = {
  animationsEnabled: boolean;
  contextLabel: string;
  history: CoinHistoryEntry[];
  onFlip: () => CoinSide;
  onOpenPremium: () => void;
  onOpenSettings: () => void;
  result: CoinSide | null;
  roundMode: RoundMode;
};

export function CoinModeScreen({
  animationsEnabled,
  contextLabel,
  history,
  onFlip,
  onOpenPremium,
  onOpenSettings,
  result,
  roundMode,
}: CoinModeScreenProps) {
  return (
    <View style={styles.surface}>
      <SciFiBackdrop animationsEnabled={animationsEnabled} />
      <TopBar
        contextDisabled
        contextLabel={contextLabel}
        onOpenModePicker={() => undefined}
        onOpenPremium={onOpenPremium}
        onOpenSettings={onOpenSettings}
        roundMode={roundMode}
        showPremiumButton
      />
      <CoinScreen history={history} onFlip={onFlip} result={result} />
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
