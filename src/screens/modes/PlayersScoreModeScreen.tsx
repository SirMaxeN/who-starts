import { StyleSheet, View } from 'react-native';
import { PlayersScoreScreen } from '../../components/PlayersScoreScreen';
import { SciFiBackdrop } from '../../components/SciFiBackdrop';
import { TopBar } from '../../components/TopBar';
import type { RoundMode } from '../../types/game';
import { usePlayersScore } from '../../hooks/usePlayersScore';

type PlayersScoreModeScreenProps = {
  animationsEnabled: boolean;
  contextLabel: string;
  onOpenPremium: () => void;
  onOpenSettings: () => void;
  roundMode: RoundMode;
  score: ReturnType<typeof usePlayersScore>;
};

export function PlayersScoreModeScreen({
  animationsEnabled,
  contextLabel,
  onOpenPremium,
  onOpenSettings,
  roundMode,
  score,
}: PlayersScoreModeScreenProps) {
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
      <PlayersScoreScreen
        activePlayerId={score.activePlayerId}
        history={score.history}
        onAddPlayer={score.addPlayer}
        onChangeEntry={score.changeEntry}
        onCommitEntry={score.commitEntry}
        onRenamePlayer={score.renamePlayer}
        onReset={score.reset}
        onSave={score.save}
        onSelectPlayer={score.selectPlayer}
        players={score.players}
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
