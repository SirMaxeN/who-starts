import { StyleSheet, View } from 'react-native';
import { PlayersScoreScreen } from '../../components/PlayersScoreScreen';
import { SciFiBackdrop } from '../../components/SciFiBackdrop';
import { TopBar } from '../../components/TopBar';
import type { RoundMode } from '../../types/game';
import { usePlayersScore } from '../../hooks/usePlayersScore';

type PlayersScoreModeScreenProps = {
  animationsEnabled: boolean;
  contextLabel: string;
  onActionHaptic?: () => void;
  onAddEntrySuccess?: () => void;
  onOpenPremium: () => void;
  onOpenSettings: () => void;
  onOpenViewPicker: () => void;
  onPlayKeypad?: () => void;
  onPlayPlayer?: (playbackRate: number) => void;
  onPlaySlide?: () => void;
  onResetHaptic?: () => void;
  onSaveHaptic?: () => void;
  onShowScore: () => void;
  roundMode: RoundMode;
  score: ReturnType<typeof usePlayersScore>;
  view: 'history' | 'score';
};

export function PlayersScoreModeScreen({
  animationsEnabled,
  contextLabel,
  onActionHaptic,
  onAddEntrySuccess,
  onOpenPremium,
  onOpenSettings,
  onOpenViewPicker,
  onPlayKeypad,
  onPlayPlayer,
  onPlaySlide,
  onResetHaptic,
  onSaveHaptic,
  onShowScore,
  roundMode,
  score,
  view,
}: PlayersScoreModeScreenProps) {
  return (
    <View style={styles.surface}>
      <SciFiBackdrop animationsEnabled={animationsEnabled} />
      <TopBar
        contextLabel={contextLabel}
        onOpenModePicker={onOpenViewPicker}
        onOpenPremium={onOpenPremium}
        onOpenSettings={onOpenSettings}
        roundMode={roundMode}
        showPremiumButton
      />
      <PlayersScoreScreen
        activePlayerId={score.activePlayerId}
        history={score.history}
        lastSavedSnapshotId={score.lastSavedSnapshotId}
        onAddEntry={score.addEntry}
        onAddPlayer={() => {
          onActionHaptic?.();
          score.addPlayer();
        }}
        onDeleteEntry={score.deleteEntry}
        onDeleteHistorySnapshot={score.deleteHistorySnapshot}
        onDeletePlayer={score.deletePlayer}
        onEditHistorySnapshot={(snapshotId) => {
          score.editHistorySnapshot(snapshotId);
          onShowScore();
        }}
        onKeypadPress={onPlayKeypad}
        onPlayerSound={onPlayPlayer}
        onRenameHistorySnapshot={score.renameHistorySnapshot}
        onRenamePlayer={score.renamePlayer}
        onReset={() => {
          if (score.players.length === 0) {
            return;
          }

          onResetHaptic?.();
          score.reset();
        }}
        onResetPlayerScore={score.resetPlayerScore}
        onSave={() => {
          if (score.players.length === 0) {
            return;
          }

        onSaveHaptic?.();
        score.save();
      }}
        onSelectPlayer={(playerId) => {
          onActionHaptic?.();
          score.selectPlayer(playerId);
        }}
        onSetPlayerColor={score.setPlayerColor}
        onSlideSound={onPlaySlide}
        onSuccess={onActionHaptic}
        onWarning={onResetHaptic}
        players={score.players}
        view={view}
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
