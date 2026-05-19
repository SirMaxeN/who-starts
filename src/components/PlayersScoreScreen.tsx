import { ScrollView, StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import type { ScoreEntry, ScoreHistorySnapshot, ScorePlayer } from '../types/game';

type PlayersScoreScreenProps = {
  activePlayerId: string | null;
  history: ScoreHistorySnapshot[];
  onAddPlayer: () => void;
  onChangeEntry: (playerId: string, entryId: string, expression: string) => void;
  onCommitEntry: (playerId: string, entryId: string) => void;
  onRenamePlayer: (playerId: string, name: string) => void;
  onReset: () => void;
  onSave: () => void;
  onSelectPlayer: (playerId: string) => void;
  players: ScorePlayer[];
};

export function PlayersScoreScreen({
  activePlayerId,
  history,
  onAddPlayer,
  onChangeEntry,
  onCommitEntry,
  onRenamePlayer,
  onReset,
  onSave,
  onSelectPlayer,
  players,
}: PlayersScoreScreenProps) {
  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? players[0] ?? null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Players Score</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onSave} style={styles.smallAction}>
            <Text style={styles.smallActionText}>Save</Text>
          </Pressable>
          <Pressable onPress={onReset} style={styles.smallAction}>
            <Text style={styles.smallActionText}>Reset</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.tabsContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
      >
        {players.map((player) => {
          const place =
            [...players]
              .sort((left, right) => right.total - left.total)
              .findIndex((item) => item.id === player.id) + 1;

          return (
            <Pressable
              key={player.id}
              onPress={() => onSelectPlayer(player.id)}
              style={[
                styles.playerTab,
                activePlayer?.id === player.id && styles.playerTabActive,
              ]}
            >
              <View style={[styles.playerColor, { backgroundColor: player.color }]} />
              <Text numberOfLines={1} style={styles.playerName}>
                {player.name}
              </Text>
              <Text style={styles.playerMeta}>{player.total}</Text>
              <Text style={styles.playerPlace}>#{place}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={onAddPlayer} style={styles.addTab}>
          <Text style={styles.addTabText}>+</Text>
        </Pressable>
      </ScrollView>

      {activePlayer ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.label}>Player name</Text>
            <TextInput
              onChangeText={(value) => onRenamePlayer(activePlayer.id, value)}
              placeholder="Player"
              placeholderTextColor="#6E88A5"
              style={styles.nameInput}
              value={activePlayer.name}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Entries</Text>
            <View style={styles.entriesWrap}>
              {activePlayer.entries.map((entry) => (
                <ScoreEntryField
                  entry={entry}
                  key={entry.id}
                  onBlur={() => onCommitEntry(activePlayer.id, entry.id)}
                  onChangeText={(value) => onChangeEntry(activePlayer.id, entry.id, value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>History</Text>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>No saved snapshots yet.</Text>
            ) : (
              history.map((snapshot) => (
                <View key={snapshot.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </Text>
                  <Text numberOfLines={1} style={styles.historySummary}>
                    {snapshot.players.map((player) => `${player.name} ${player.total}`).join(' | ')}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No players yet</Text>
          <Text style={styles.emptyHint}>Add your first player to start tracking scores.</Text>
        </View>
      )}
    </View>
  );
}

type ScoreEntryFieldProps = {
  entry: ScoreEntry;
  onBlur: () => void;
  onChangeText: (value: string) => void;
};

function ScoreEntryField({ entry, onBlur, onChangeText }: ScoreEntryFieldProps) {
  return (
    <View style={styles.entryRow}>
      <TextInput
        keyboardType="numbers-and-punctuation"
        onBlur={onBlur}
        onChangeText={onChangeText}
        placeholder="Type value or math"
        placeholderTextColor="#6E88A5"
        style={[styles.entryInput, entry.error && styles.entryInputError]}
        value={entry.expression}
      />
      <Text style={styles.entryValue}>{entry.value ?? '-'}</Text>
      {entry.error ? <Text style={styles.entryError}>{entry.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 108,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  eyebrow: {
    color: '#88B4D9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 12, 26, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(97, 222, 255, 0.22)',
  },
  smallActionText: {
    color: '#E9F7FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tabs: {
    marginTop: 18,
    maxHeight: 100,
  },
  tabsContent: {
    gap: 12,
    paddingHorizontal: 18,
  },
  playerTab: {
    width: 128,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  playerTabActive: {
    backgroundColor: 'rgba(0, 228, 255, 0.12)',
    borderColor: 'rgba(0, 228, 255, 0.32)',
  },
  playerColor: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginBottom: 8,
  },
  playerName: {
    color: '#F4FBFF',
    fontSize: 15,
    fontWeight: '700',
  },
  playerMeta: {
    marginTop: 6,
    color: '#8AF4FF',
    fontSize: 22,
    fontWeight: '800',
  },
  playerPlace: {
    marginTop: 2,
    color: '#8CA4BF',
    fontSize: 12,
    fontWeight: '700',
  },
  addTab: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  addTabText: {
    color: '#8AF4FF',
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(8, 14, 30, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.18)',
    gap: 12,
  },
  label: {
    color: '#8FB3D8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  nameInput: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F4FBFF',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 16,
    fontWeight: '700',
  },
  entriesWrap: {
    gap: 10,
  },
  entryRow: {
    gap: 6,
  },
  entryInput: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F4FBFF',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 16,
    fontWeight: '700',
  },
  entryInputError: {
    borderColor: 'rgba(255, 84, 112, 0.6)',
  },
  entryValue: {
    color: '#8AF4FF',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  entryError: {
    color: '#FF97A8',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  historyEmpty: {
    color: '#8099B8',
    fontSize: 14,
  },
  historyRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyDate: {
    color: '#8FB3D8',
    fontSize: 12,
    fontWeight: '700',
  },
  historySummary: {
    marginTop: 4,
    color: '#F4FBFF',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#F4FBFF',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyHint: {
    marginTop: 8,
    color: '#8CA4BF',
    fontSize: 14,
    textAlign: 'center',
  },
});
