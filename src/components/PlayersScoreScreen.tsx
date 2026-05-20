import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SCORE_PLAYER_COLORS } from '../constants/game';
import type { ScoreEntry, ScoreHistorySnapshot, ScorePlayer } from '../types/game';
import type { ParsedExpression } from '../utils/expression';
import { isTabletSize } from '../utils/layout';

type ScoreboardView = 'history' | 'score';

type PlayersScoreScreenProps = {
  activePlayerId: string | null;
  history: ScoreHistorySnapshot[];
  lastSavedSnapshotId: string | null;
  onAddEntry: (playerId: string, expression: string) => ParsedExpression;
  onAddPlayer: () => void;
  onDeleteEntry: (playerId: string, entryId: string) => void;
  onDeleteHistorySnapshot: (snapshotId: string) => void;
  onDeletePlayer: (playerId: string) => void;
  onEditHistorySnapshot: (snapshotId: string) => void;
  onKeypadPress?: () => void;
  onPlayerSound?: (playbackRate: number) => void;
  onRenameHistorySnapshot: (snapshotId: string, name: string) => void;
  onReset: () => void;
  onResetPlayerScore: (playerId: string) => void;
  onSave: () => void;
  onSelectPlayer: (playerId: string) => void;
  onSetPlayerColor: (playerId: string, color: string) => void;
  onSlideSound?: () => void;
  onSuccess?: () => void;
  onWarning?: () => void;
  onRenamePlayer: (playerId: string, name: string) => void;
  players: ScorePlayer[];
  view: ScoreboardView;
};

type ConfirmAction = {
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  title: string;
} | null;

function getCompetitionPlace<T extends { total: number }>(sortedItems: T[], item: T) {
  const firstWithSameScore = sortedItems.findIndex((candidate) => candidate.total === item.total);
  return firstWithSameScore + 1;
}

const KEYPAD_ROWS = [
  ['-1', '+1', '+5', '+10'],
  ['1', '2', '3', '+'],
  ['4', '5', '6', '-'],
  ['7', '8', '9', '*'],
  ['C', '0', '<', '/'],
  ['.', 'Done'],
];

export function PlayersScoreScreen({
  activePlayerId,
  history,
  lastSavedSnapshotId,
  onAddEntry,
  onAddPlayer,
  onDeleteEntry,
  onDeleteHistorySnapshot,
  onDeletePlayer,
  onEditHistorySnapshot,
  onKeypadPress,
  onPlayerSound,
  onRenameHistorySnapshot,
  onRenamePlayer,
  onReset,
  onResetPlayerScore,
  onSave,
  onSelectPlayer,
  onSetPlayerColor,
  onSlideSound,
  onSuccess,
  onWarning,
  players,
  view,
}: PlayersScoreScreenProps) {
  const { height, width } = useWindowDimensions();
  const isLandscape = width > height;
  const isCompactLandscape = isLandscape && height < 520;
  const isTablet = isTabletSize(width, height);
  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? players[0] ?? null;
  const sortedPlayers = useMemo(
    () => [...players].sort((left, right) => right.total - left.total),
    [players]
  );
  const expressionPop = useRef(new Animated.Value(1)).current;
  const totalPulse = useRef(new Animated.Value(0)).current;
  const historySlide = useRef(new Animated.Value(1)).current;
  const historyTouchStart = useRef<{ x: number; y: number } | null>(null);
  const playersRailRef = useRef<ScrollView | null>(null);
  const saveFly = useRef(new Animated.Value(0)).current;
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [draftColor, setDraftColor] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftSnapshotName, setDraftSnapshotName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [expression, setExpression] = useState('');
  const [expressionError, setExpressionError] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const editingPlayer = players.find((player) => player.id === editingPlayerId) ?? null;
  const hasPlayers = players.length > 0;
  const canAddPlayer = players.length < 20;
  const activePlace = activePlayer ? getCompetitionPlace(sortedPlayers, activePlayer) : 0;
  const visibleHistory = history[historyIndex] ?? null;

  useEffect(() => {
    if (historyIndex >= history.length) {
      setHistoryIndex(Math.max(0, history.length - 1));
    }
  }, [history.length, historyIndex]);

  useEffect(() => {
    if (!lastSavedSnapshotId) {
      return;
    }

    const savedIndex = history.findIndex((snapshot) => snapshot.id === lastSavedSnapshotId);
    if (savedIndex >= 0) {
      setHistoryIndex(savedIndex);
    }
  }, [history, lastSavedSnapshotId]);

  useEffect(() => {
    requestAnimationFrame(() => playersRailRef.current?.scrollToEnd({ animated: true }));
  }, [players.length]);

  useEffect(() => {
    totalPulse.stopAnimation();
    totalPulse.setValue(0);
    Animated.sequence([
      Animated.timing(totalPulse, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(totalPulse, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activePlayer?.total, totalPulse]);

  function getPlace(playerId: string) {
    const player = players.find((item) => item.id === playerId);
    return player ? getCompetitionPlace(sortedPlayers, player) : 0;
  }

  function openEditPlayer(player: ScorePlayer) {
    setEditingPlayerId(player.id);
    setDraftName('');
    setDraftColor(player.color);
  }

  function closeEditPlayer() {
    setEditingPlayerId(null);
    setDraftColor('');
    setDraftName('');
  }

  function openEditSnapshot(snapshot: ScoreHistorySnapshot) {
    setEditingSnapshotId(snapshot.id);
    setDraftSnapshotName(snapshot.name);
  }

  function closeEditSnapshot() {
    setEditingSnapshotId(null);
    setDraftSnapshotName('');
  }

  function handleSavePlayerEdit() {
    if (!editingPlayer) {
      return;
    }

    const nextName = draftName.trim() || editingPlayer.name;
    onRenamePlayer(editingPlayer.id, nextName);
    if (draftColor && draftColor !== editingPlayer.color) {
      onSetPlayerColor(editingPlayer.id, draftColor);
    }
    onSuccess?.();
    closeEditPlayer();
  }

  function handleSaveSnapshotName() {
    if (!editingSnapshotId) {
      return;
    }

    onRenameHistorySnapshot(editingSnapshotId, draftSnapshotName);
    onSuccess?.();
    closeEditSnapshot();
  }

  function appendToExpression(value: string) {
    onKeypadPress?.();
    setExpressionError(null);
    setExpression((current) => `${current}${value}`);
    expressionPop.stopAnimation();
    expressionPop.setValue(0.92);
    Animated.spring(expressionPop, {
      toValue: 1,
      damping: 9,
      mass: 0.5,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }

  function handleKeypadPress(value: string) {
    if (!activePlayer) {
      return;
    }

    if (value === 'C') {
      onKeypadPress?.();
      setExpression('');
      setExpressionError(null);
      return;
    }

    if (value === '<') {
      onKeypadPress?.();
      setExpression((current) => current.slice(0, -1));
      setExpressionError(null);
      return;
    }

    if (value === 'Done') {
      onKeypadPress?.();
      commitExpression();
      return;
    }

    if (value === '-1' || value === '+1' || value === '+5' || value === '+10') {
      onKeypadPress?.();
      const result = onAddEntry(activePlayer.id, value.startsWith('+') ? value.slice(1) : value);
      if (result.error) {
        setExpressionError(result.error);
        onWarning?.();
        return;
      }

      setExpression('');
      setExpressionError(null);
      onSuccess?.();
      return;
    }

    appendToExpression(value);
  }

  function commitExpression() {
    if (!activePlayer || !expression.trim()) {
      return;
    }

    const result = onAddEntry(activePlayer.id, expression);
    if (result.error) {
      setExpressionError(result.error);
      onWarning?.();
      return;
    }

    setExpression('');
    setExpressionError(null);
    onSuccess?.();
  }

  function handleSavePress() {
    if (!hasPlayers) {
      return;
    }

    saveFly.stopAnimation();
    saveFly.setValue(0);
    setIsSaving(true);
    Animated.timing(saveFly, {
      toValue: 1,
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onSave();
      requestAnimationFrame(() => {
        saveFly.setValue(0);
        setIsSaving(false);
      });
    });
  }

  function handleHistorySwipe(direction: -1 | 1) {
    if (history.length <= 1) {
      return;
    }

    onSlideSound?.();
    setHistoryIndex((current) => (current + direction + history.length) % history.length);
    historySlide.stopAnimation();
    historySlide.setValue(0);
    Animated.timing(historySlide, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function handleHistoryTouchEnd(x: number, y: number) {
    const start = historyTouchStart.current;
    historyTouchStart.current = null;

    if (!start) {
      return;
    }

    const deltaX = x - start.x;
    const deltaY = y - start.y;

    if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      handleHistorySwipe(deltaX > 0 ? -1 : 1);
    }
  }

  function renderScoreView() {
    return (
      <>
        <View style={[styles.header, isTablet && styles.contentFrame]}>
          <Text style={styles.eyebrow}>Scoreboard</Text>
          <View style={styles.headerActions}>
            <Pressable
              disabled={!hasPlayers}
              onPress={handleSavePress}
              style={[styles.smallAction, !hasPlayers && styles.actionDisabled]}
            >
              <Text style={[styles.smallActionText, !hasPlayers && styles.actionDisabledText]}>
                Save
              </Text>
            </Pressable>
            <Pressable
              disabled={!hasPlayers}
              onPress={() =>
                setConfirmAction({
                  body: 'This clears all players and all current entries.',
                  confirmLabel: 'Reset',
                  onConfirm: onReset,
                  title: 'Reset table?',
                })
              }
              style={[styles.smallActionDanger, !hasPlayers && styles.actionDisabled]}
            >
              <Text style={[styles.smallActionText, !hasPlayers && styles.actionDisabledText]}>
                Reset
              </Text>
            </Pressable>
          </View>
        </View>

        <Animated.View
          pointerEvents={isSaving ? 'none' : 'auto'}
          style={{
            opacity: saveFly.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            transform: [
              {
                translateY: saveFly.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -84],
                }),
              },
              {
                scale: saveFly.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.58],
                }),
              },
            ],
          }}
        >
          <ScrollView
            contentContainerStyle={styles.playersContent}
            horizontal
            ref={playersRailRef}
            showsHorizontalScrollIndicator={false}
            style={[styles.playersRail, isTablet && styles.contentFrame]}
          >
            {players.map((player) => (
              <PlayerTile
                isActive={activePlayer?.id === player.id}
                key={player.id}
                onPress={() => onSelectPlayer(player.id)}
                place={getPlace(player.id)}
                player={player}
              />
            ))}
            <Pressable
              disabled={!canAddPlayer}
              onPress={() => {
                onAddPlayer();
                onPlayerSound?.(0.9 + players.length * 0.08);
              }}
              style={[styles.addPlayerTile, !canAddPlayer && styles.actionDisabled]}
            >
              <Text style={styles.addPlayerText}>+</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>

        {activePlayer ? (
          <Animated.View
            style={[
              styles.scoreBody,
              isTablet && styles.contentFrame,
              {
                opacity: saveFly.interpolate({
                  inputRange: [0, 0.62, 1],
                  outputRange: [1, 0.42, 0],
                }),
                transform: [
                  {
                    translateY: saveFly.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 18],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scoreContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.activeCard, { borderColor: `${activePlayer.color}66` }]}>
              <View style={styles.activeActions}>
                <Pressable onPress={() => openEditPlayer(activePlayer)} style={styles.activeIconButton}>
                  <Text style={styles.activeIconText}>✎</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setConfirmAction({
                      body: 'This clears only this player score entries.',
                      confirmLabel: 'Reset',
                      onConfirm: () => onResetPlayerScore(activePlayer.id),
                      title: 'Reset player score?',
                    })
                  }
                  style={styles.activeIconButton}
                >
                  <Text style={styles.activeIconText}>↻</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setConfirmAction({
                      body: 'This removes this player from the current scoreboard.',
                      confirmLabel: 'Delete',
                      onConfirm: () => onDeletePlayer(activePlayer.id),
                      title: 'Delete player?',
                    })
                  }
                  style={[styles.activeIconButton, styles.activeDangerButton]}
                >
                  <Text style={styles.activeIconText}>🗑</Text>
                </Pressable>
              </View>
              <Text style={styles.activeLabel}>Active player</Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.58}
                numberOfLines={1}
                style={[styles.activeName, { color: activePlayer.color }]}
              >
                {activePlayer.name}
              </Text>
              <Animated.Text
                style={[
                  styles.activeTotal,
                  {
                    transform: [
                      {
                        scale: totalPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.08],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {activePlayer.total}
              </Animated.Text>
              <View style={[styles.activePlaceBadge, { borderColor: activePlayer.color }]}>
                <Text style={styles.activePlaceText}>#{activePlace}</Text>
              </View>
              </View>

              <View style={styles.quickAddCard}>
              <Text style={styles.label}>Quick Add</Text>
              <Animated.View
                style={[styles.expressionBox, { transform: [{ scale: expressionPop }] }]}
              >
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.54}
                  numberOfLines={1}
                  style={styles.expressionText}
                >
                  {expression || 'Type points or math'}
                </Text>
              </Animated.View>
              {expressionError ? <Text style={styles.entryError}>{expressionError}</Text> : null}
              <Keypad onPress={handleKeypadPress} />
              </View>

              <View style={styles.entriesCard}>
              <Text style={styles.label}>Recent entries</Text>
              {activePlayer.entries.length === 0 ? (
                <Text style={styles.emptyHint}>No entries yet.</Text>
              ) : (
                <View style={styles.entryChips}>
                  {activePlayer.entries.map((entry) => (
                    <EntryChip
                      entry={entry}
                      key={entry.id}
                      onDelete={() => {
                        onWarning?.();
                        onDeleteEntry(activePlayer.id, entry.id);
                      }}
                    />
                  ))}
                </View>
              )}
              </View>
            </ScrollView>
          </Animated.View>
        ) : isSaving ? null : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No players yet</Text>
            <Text style={styles.emptyHint}>Add your first player to start tracking scores.</Text>
          </View>
        )}
      </>
    );
  }

  function renderHistoryView() {
    const slideX = historySlide.interpolate({
      inputRange: [0, 1],
      outputRange: [36, 0],
    });
    const slideOpacity = historySlide.interpolate({
      inputRange: [0, 1],
      outputRange: [0.48, 1],
    });

    return (
      <View style={styles.historyView}>
        <View
          style={[
            styles.header,
            isTablet && styles.contentFrame,
            isCompactLandscape && styles.headerCompact,
          ]}
        >
          <Text style={styles.eyebrow}>History</Text>
          <Text style={styles.historyCounter}>
            {history.length === 0 ? '0 / 0' : `${historyIndex + 1} / ${history.length}`}
          </Text>
        </View>
        {visibleHistory ? (
          <Animated.View
            onMoveShouldSetResponderCapture={(event) => {
              const start = historyTouchStart.current;
              const touch = event.nativeEvent.touches[0];
              if (!start || !touch) {
                return false;
              }

              const deltaX = touch.pageX - start.x;
              const deltaY = touch.pageY - start.y;
              return Math.abs(deltaX) > 18 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
            }}
            onResponderRelease={(event) => {
              handleHistoryTouchEnd(event.nativeEvent.pageX, event.nativeEvent.pageY);
            }}
            onTouchEnd={(event) => {
              const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
              handleHistoryTouchEnd(touch.pageX, touch.pageY);
            }}
            onTouchStart={(event) => {
              const touch = event.nativeEvent.changedTouches[0] ?? event.nativeEvent;
              historyTouchStart.current = { x: touch.pageX, y: touch.pageY };
            }}
            style={[
              styles.historyCard,
              isTablet && styles.historyCardTablet,
              isCompactLandscape && styles.historyCardCompact,
              { opacity: slideOpacity, transform: [{ translateX: slideX }] },
            ]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.58}
              numberOfLines={1}
              style={[styles.historyName, isCompactLandscape && styles.historyNameCompact]}
            >
              {visibleHistory.name}
            </Text>
            <Text style={[styles.historyDate, isCompactLandscape && styles.historyDateCompact]}>
              {new Date(visibleHistory.createdAt).toLocaleString()}
            </Text>
            <View style={[styles.historyPlayersMask, isCompactLandscape && styles.historyPlayersMaskCompact]}>
              <ScrollView
                contentContainerStyle={[
                  styles.historyPlayers,
                  isCompactLandscape && styles.historyPlayersCompact,
                ]}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
              {visibleHistory.players.map((player) => (
                <View
                  key={`${visibleHistory.id}-${player.id}`}
                  style={[
                    styles.historyPlayerRow,
                    isCompactLandscape && styles.historyPlayerRowCompact,
                  ]}
                >
                  <View style={[styles.historyRank, { borderColor: player.color }]}>
                    <Text style={styles.historyRankText}>
                      #{getCompetitionPlace(visibleHistory.players, player)}
                    </Text>
                  </View>
                    <Text numberOfLines={1} style={[styles.historyPlayerName, { color: player.color }]}>
                      {player.name}
                    </Text>
                    <Text style={styles.historyPlayerTotal}>{player.total}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={[styles.historyActions, isCompactLandscape && styles.historyActionsCompact]}>
              <Pressable
                onPress={() => {
                  onEditHistorySnapshot(visibleHistory.id);
                  onSuccess?.();
                }}
                style={[styles.historyActionButton, isCompactLandscape && styles.historyActionButtonCompact]}
              >
                <Text style={styles.historyActionText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => openEditSnapshot(visibleHistory)}
                style={[styles.historyRenameButton, isCompactLandscape && styles.historyActionButtonCompact]}
              >
                <Text style={styles.historyActionText}>Rename</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setConfirmAction({
                    body: 'This removes this saved snapshot only.',
                    confirmLabel: 'Delete',
                    onConfirm: () => onDeleteHistorySnapshot(visibleHistory.id),
                    title: 'Delete snapshot?',
                  })
                }
                style={[
                  styles.historyIconButton,
                  styles.historyTrashButton,
                  isCompactLandscape && styles.historyIconButtonCompact,
                ]}
              >
                <Text style={styles.historyIconText}>🗑</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No snapshots yet</Text>
            <Text style={styles.emptyHint}>Save a scoreboard to see it here.</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, isCompactLandscape && styles.screenCompactLandscape]}
    >
      {view === 'history' ? renderHistoryView() : renderScoreView()}
      <EditPlayerModal
        draftColor={draftColor}
        draftName={draftName}
        player={editingPlayer}
        onChangeName={setDraftName}
        onClose={closeEditPlayer}
        onResetPlayer={(playerId) =>
          setConfirmAction({
            body: 'This clears only this player score entries.',
            confirmLabel: 'Reset',
            onConfirm: () => {
              onResetPlayerScore(playerId);
              closeEditPlayer();
            },
            title: 'Reset player score?',
          })
        }
        onDeletePlayer={(playerId) =>
          setConfirmAction({
            body: 'This removes this player from the current scoreboard.',
            confirmLabel: 'Delete',
            onConfirm: () => {
              onDeletePlayer(playerId);
              closeEditPlayer();
            },
            title: 'Delete player?',
          })
        }
        onSave={handleSavePlayerEdit}
        onSelectColor={setDraftColor}
      />
      <EditSnapshotModal
        draftName={draftSnapshotName}
        onChangeName={setDraftSnapshotName}
        onClose={closeEditSnapshot}
        onSave={handleSaveSnapshotName}
        visible={editingSnapshotId !== null}
      />
      <ConfirmOverlay
        action={confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          confirmAction?.onConfirm();
          onSuccess?.();
          setConfirmAction(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function PlayerTile({
  isActive,
  onPress,
  place,
  player,
}: {
  isActive: boolean;
  onPress: () => void;
  place: number;
  player: ScorePlayer;
}) {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      damping: 10,
      mass: 0.65,
      stiffness: 170,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  return (
    <Animated.View
      style={[
        styles.playerTileWrap,
        {
          transform: [
            {
              scale: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [0.84, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.placeBadge, { borderColor: player.color }]}>
        <Text style={styles.placeBadgeText}>#{place}</Text>
      </View>
      <Pressable
        onPress={onPress}
        style={[
          styles.playerTile,
          {
            backgroundColor: `${player.color}18`,
            borderColor: isActive ? player.color : `${player.color}55`,
            shadowColor: player.color,
          },
          isActive && styles.playerTileActive,
        ]}
      >
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.38}
          numberOfLines={1}
          style={styles.playerName}
        >
          {player.name}
        </Text>
        <Text style={styles.playerTotal}>{player.total}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Keypad({ onPress }: { onPress: (value: string) => void }) {
  return (
    <View style={styles.keypad}>
      {KEYPAD_ROWS.map((row) => (
        <View key={row.join('-')} style={styles.keypadRow}>
          {row.map((key) => {
            const isShortcut = key === '-1' || key === '+1' || key === '+5' || key === '+10';

            return (
              <Pressable
                key={key}
                onPress={() => onPress(key)}
                style={[
                  styles.keypadKey,
                  isShortcut && styles.keypadShortcut,
                  key === 'Done' && styles.keypadDone,
                ]}
              >
                <Text
                  style={[
                    styles.keypadText,
                    isShortcut && styles.keypadShortcutText,
                    key === '<' && styles.keypadBackspaceText,
                    key === 'Done' && styles.keypadDoneText,
                  ]}
                >
                  {key === '<' ? '⌫' : key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function EntryChip({ entry, onDelete }: { entry: ScoreEntry; onDelete: () => void }) {
  const appear = useRef(new Animated.Value(0)).current;
  const displayValue =
    entry.value === null ? entry.expression : entry.value > 0 ? `+${entry.value}` : `${entry.value}`;

  useEffect(() => {
    Animated.spring(appear, {
      toValue: 1,
      damping: 9,
      mass: 0.55,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  return (
    <Animated.View
      style={[
        styles.entryChip,
        {
          transform: [
            {
              scale: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [0.82, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.entryChipText}>{displayValue}</Text>
      <Pressable onPress={onDelete} style={styles.entryDelete}>
        <Text style={styles.entryDeleteText}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

function EditPlayerModal({
  draftColor,
  draftName,
  onChangeName,
  onClose,
  onDeletePlayer,
  onResetPlayer,
  onSave,
  onSelectColor,
  player,
}: {
  draftColor: string;
  draftName: string;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onDeletePlayer: (playerId: string) => void;
  onResetPlayer: (playerId: string) => void;
  onSave: () => void;
  onSelectColor: (color: string) => void;
  player: ScorePlayer | null;
}) {
  if (!player) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.editModal}
      >
        <Text style={styles.modalTitle}>Edit player</Text>
        <TextInput
          maxLength={24}
          onChangeText={onChangeName}
          onFocus={() => {
            if (draftName === player.name) {
              onChangeName('');
            }
          }}
          placeholder={player.name}
          placeholderTextColor="#6E88A5"
          style={styles.nameInput}
          value={draftName}
        />
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorGrid}>
          {SCORE_PLAYER_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => onSelectColor(color)}
              style={[
                styles.colorChoice,
                {
                  backgroundColor: color,
                  borderColor: draftColor === color ? '#FFFFFF' : color,
                  opacity: draftColor === color ? 1 : 0.68,
                },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={() => onResetPlayer(player.id)} style={styles.resetPlayerButton}>
          <Text style={styles.resetPlayerText}>Reset player score</Text>
        </Pressable>
        <Pressable onPress={() => onDeletePlayer(player.id)} style={styles.deletePlayerTextButton}>
          <Text style={styles.deletePlayerText}>Delete player</Text>
        </Pressable>
        <View style={styles.modalActions}>
          <Pressable onPress={onClose} style={styles.modalSecondary}>
            <Text style={styles.modalSecondaryText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onSave} style={styles.modalPrimary}>
            <Text style={styles.modalPrimaryText}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function EditSnapshotModal({
  draftName,
  onChangeName,
  onClose,
  onSave,
  visible,
}: {
  draftName: string;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.editModal}
      >
        <Text style={styles.modalTitle}>Name save</Text>
        <TextInput
          maxLength={28}
          onChangeText={onChangeName}
          placeholder="History name"
          placeholderTextColor="#6E88A5"
          selectTextOnFocus
          style={styles.nameInput}
          value={draftName}
        />
        <View style={styles.modalActions}>
          <Pressable onPress={onClose} style={styles.modalSecondary}>
            <Text style={styles.modalSecondaryText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onSave} style={styles.modalPrimary}>
            <Text style={styles.modalPrimaryText}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ConfirmOverlay({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable onPress={onCancel} style={StyleSheet.absoluteFill} />
      <View style={styles.confirmCard}>
        <Text style={styles.modalTitle}>{action.title}</Text>
        <Text style={styles.confirmBody}>{action.body}</Text>
        <View style={styles.modalActions}>
          <Pressable onPress={onCancel} style={styles.modalSecondary}>
            <Text style={styles.modalSecondaryText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={styles.modalDanger}>
            <Text style={styles.modalPrimaryText}>{action.confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 108,
    paddingBottom: 18,
    alignItems: 'center',
  },
  screenCompactLandscape: {
    paddingTop: 82,
    paddingBottom: 8,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  contentFrame: {
    width: '100%',
    maxWidth: 760,
  },
  headerCompact: {
    paddingHorizontal: 14,
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
    gap: 8,
  },
  smallAction: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 26, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(97, 222, 255, 0.22)',
  },
  smallActionDanger: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 84, 112, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.28)',
  },
  smallActionText: {
    color: '#E9F7FF',
    fontSize: 12,
    fontWeight: '800',
    includeFontPadding: false,
    letterSpacing: 0.8,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  actionDisabled: {
    opacity: 0.42,
  },
  actionDisabledText: {
    color: '#6D86A3',
  },
  playersRail: {
    marginTop: 8,
    maxHeight: 88,
  },
  playersContent: {
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  playerTileWrap: {
    width: 84,
    height: 70,
  },
  playerTile: {
    flex: 1,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  playerTileActive: {
    shadowOpacity: 0.48,
  },
  placeBadge: {
    position: 'absolute',
    top: -6,
    left: 7,
    zIndex: 2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07111F',
    borderWidth: 1,
  },
  placeBadgeText: {
    color: '#EAF7FF',
    fontSize: 10,
    fontWeight: '900',
  },
  editButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  editButtonText: {
    color: '#EAF7FF',
    fontSize: 13,
    fontWeight: '900',
  },
  playerName: {
    width: '100%',
    color: '#F4FBFF',
    fontSize: 12,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 15,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  playerTotal: {
    marginTop: 5,
    color: '#F4FBFF',
    fontSize: 17,
    fontWeight: '900',
  },
  addPlayerTile: {
    width: 52,
    height: 62,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addPlayerText: {
    color: '#8AF4FF',
    fontSize: 25,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 30,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  scoreContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 8,
  },
  scoreBody: {
    flex: 1,
  },
  activeCard: {
    minHeight: 92,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 34,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 14, 30, 0.82)',
    borderWidth: 1,
  },
  activeActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  activeIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  activeDangerButton: {
    backgroundColor: 'rgba(255, 84, 112, 0.12)',
    borderColor: 'rgba(255, 84, 112, 0.3)',
  },
  activeIconText: {
    color: '#EAF7FF',
    fontSize: 15,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 28,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  activeLabel: {
    color: '#8FB3D8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  activeName: {
    marginTop: 4,
    width: '100%',
    fontSize: 18,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  activeTotal: {
    marginTop: 2,
    color: '#F4FBFF',
    fontSize: 30,
    fontWeight: '900',
  },
  activePlaceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
  },
  activePlaceText: {
    color: '#EAF7FF',
    fontSize: 11,
    fontWeight: '900',
  },
  quickAddCard: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: 'rgba(8, 14, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.16)',
    gap: 7,
  },
  label: {
    color: '#8FB3D8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  expressionBox: {
    minHeight: 34,
    borderRadius: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  expressionText: {
    width: '100%',
    color: '#F4FBFF',
    fontSize: 17,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 21,
    textAlign: 'center',
  },
  keypad: {
    gap: 6,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keypadKey: {
    flex: 1,
    minHeight: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keypadDone: {
    flex: 3,
    backgroundColor: 'rgba(0, 228, 255, 0.16)',
    borderColor: 'rgba(0, 228, 255, 0.38)',
  },
  keypadShortcut: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    borderColor: 'rgba(255, 184, 0, 0.26)',
  },
  keypadText: {
    color: '#EAF7FF',
    fontSize: 14,
    fontWeight: '900',
  },
  keypadShortcutText: {
    color: '#FFE3A1',
  },
  keypadDoneText: {
    color: '#8AF4FF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  keypadBackspaceText: {
    fontSize: 18,
  },
  entriesCard: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: 'rgba(8, 14, 30, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.13)',
    gap: 8,
  },
  entryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryChip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingLeft: 12,
    backgroundColor: 'rgba(0, 228, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 228, 255, 0.25)',
  },
  entryChipText: {
    color: '#CFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  entryDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryDeleteText: {
    color: '#FF9AA8',
    fontSize: 19,
    fontWeight: '900',
  },
  entryError: {
    color: '#FF97A8',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  historyView: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  historyCounter: {
    color: '#8FB3D8',
    fontSize: 13,
    fontWeight: '800',
  },
  historyCard: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 28,
    borderRadius: 30,
    padding: 18,
    backgroundColor: 'rgba(8, 14, 30, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.24)',
  },
  historyCardTablet: {
    maxWidth: 760,
  },
  historyCardCompact: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 22,
    padding: 12,
  },
  historyName: {
    width: '100%',
    color: '#F6FDFF',
    fontSize: 22,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 27,
    textAlign: 'center',
  },
  historyNameCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  historyDate: {
    color: '#BFD9EE',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  historyDateCompact: {
    marginTop: 3,
    fontSize: 11,
  },
  historyPlayersMask: {
    flex: 1,
    minHeight: 0,
    marginTop: 16,
    marginBottom: 60,
    overflow: 'hidden',
  },
  historyPlayersMaskCompact: {
    marginTop: 8,
    marginBottom: 44,
  },
  historyPlayers: {
    gap: 10,
    paddingBottom: 12,
  },
  historyPlayersCompact: {
    gap: 6,
    paddingBottom: 8,
  },
  historyPlayerRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  historyPlayerRowCompact: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  historyRank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  historyRankText: {
    color: '#EAF7FF',
    fontSize: 12,
    fontWeight: '900',
  },
  historyPlayerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  historyPlayerTotal: {
    color: '#F4FBFF',
    fontSize: 18,
    fontWeight: '900',
  },
  historyActions: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    left: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  historyActionsCompact: {
    right: 12,
    bottom: 12,
    left: 12,
    gap: 8,
  },
  historyActionButton: {
    minWidth: 92,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 228, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 228, 255, 0.36)',
  },
  historyActionButtonCompact: {
    minWidth: 78,
    height: 36,
    borderRadius: 18,
  },
  historyActionText: {
    color: '#CFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  historyIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  historyIconButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  historyRenameButton: {
    minWidth: 104,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  historyTrashButton: {
    backgroundColor: 'rgba(255, 84, 112, 0.14)',
    borderColor: 'rgba(255, 84, 112, 0.36)',
  },
  historyIconText: {
    color: '#EAF7FF',
    fontSize: 18,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  historyIconTextCompact: {
    fontSize: 15,
    lineHeight: 36,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 4, 12, 0.72)',
  },
  editModal: {
    width: '100%',
    borderRadius: 28,
    padding: 18,
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.28)',
    gap: 12,
  },
  modalTitle: {
    color: '#F6FDFF',
    fontSize: 20,
    fontWeight: '900',
  },
  nameInput: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#F4FBFF',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 16,
    fontWeight: '800',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorChoice: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },
  resetPlayerButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 84, 112, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.32)',
  },
  resetPlayerText: {
    color: '#FFB6C0',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  deletePlayerTextButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 84, 112, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.26)',
  },
  deletePlayerText: {
    color: '#FF7087',
    fontSize: 13,
    fontWeight: '900',
    includeFontPadding: false,
    letterSpacing: 0.8,
    lineHeight: 17,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  modalPrimary: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 228, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(0, 228, 255, 0.36)',
  },
  modalDanger: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 84, 112, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.42)',
  },
  modalSecondaryText: {
    color: '#C6D8EA',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalPrimaryText: {
    color: '#F4FBFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  confirmCard: {
    width: '100%',
    borderRadius: 26,
    padding: 18,
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 112, 0.28)',
    gap: 14,
  },
  confirmBody: {
    color: '#AFC7DD',
    fontSize: 15,
    lineHeight: 22,
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
    color: '#8CA4BF',
    fontSize: 14,
    textAlign: 'center',
  },
});
