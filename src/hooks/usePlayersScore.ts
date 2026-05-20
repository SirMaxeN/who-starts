import { useEffect, useMemo, useRef, useState } from 'react';
import { SCORE_PLAYER_COLORS } from '../constants/game';
import { ScoreHistoryStorage } from '../services/ScoreHistoryStorage';
import type { ScoreEntry, ScoreHistorySnapshot, ScorePlayer } from '../types/game';
import { evaluateExpression } from '../utils/expression';

const HISTORY_LIMIT = 20;
const PLAYER_LIMIT = 20;
const PLAYER_NAME_LIMIT = 24;

function computeTotal(entries: ScoreEntry[]) {
  return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0);
}

function createCommittedEntry(index: number, expression: string, value: number): ScoreEntry {
  return {
    error: null,
    expression,
    id: `entry-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    value,
  };
}

function normalizePlayerName(name: string) {
  return name.slice(0, PLAYER_NAME_LIMIT);
}

export function usePlayersScore() {
  const [players, setPlayers] = useState<ScorePlayer[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<ScoreHistorySnapshot[]>([]);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [lastSavedSnapshotId, setLastSavedSnapshotId] = useState<string | null>(null);
  const nextPlayerNumber = useRef(1);
  const nextColorIndex = useRef(0);
  const hasLoadedHistory = useRef(false);

  useEffect(() => {
    let isMounted = true;

    ScoreHistoryStorage.load().then((snapshots) => {
      if (isMounted) {
        setHistory(snapshots.slice(0, HISTORY_LIMIT));
        hasLoadedHistory.current = true;
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedHistory.current) {
      return;
    }

    ScoreHistoryStorage.save(history);
  }, [history]);

const sortedPlayers = useMemo(
    () => [...players].sort((left, right) => right.total - left.total),
    [players]
  );

  function addPlayer() {
    if (players.length >= PLAYER_LIMIT) {
      return;
    }

    const playerNumber = nextPlayerNumber.current;
    nextPlayerNumber.current += 1;

    const player: ScorePlayer = {
      color: SCORE_PLAYER_COLORS[nextColorIndex.current % SCORE_PLAYER_COLORS.length],
      entries: [],
      id: `score-player-${Date.now()}-${playerNumber}`,
      name: `Player ${playerNumber}`,
      total: 0,
    };

    nextColorIndex.current += 1;
    setPlayers((current) => [...current, player]);
    setActivePlayerId(player.id);
  }

  function updatePlayer(playerId: string, updater: (player: ScorePlayer) => ScorePlayer) {
    setPlayers((current) =>
      current.map((player) => (player.id === playerId ? updater(player) : player))
    );
  }

  function renamePlayer(playerId: string, name: string) {
    updatePlayer(playerId, (player) => ({
      ...player,
      name: normalizePlayerName(name),
    }));
  }

  function setPlayerColor(playerId: string, color: string) {
    setPlayers((current) => {
      const targetPlayer = current.find((player) => player.id === playerId);
      const occupiedPlayer = current.find(
        (player) => player.id !== playerId && player.color === color
      );

      if (!targetPlayer || targetPlayer.color === color) {
        return current;
      }

      if (current.length > SCORE_PLAYER_COLORS.length) {
        return current.map((player) => (player.id === playerId ? { ...player, color } : player));
      }

      return current.map((player) => {
        if (player.id === playerId) {
          return { ...player, color };
        }

        if (occupiedPlayer && player.id === occupiedPlayer.id) {
          return { ...player, color: targetPlayer.color };
        }

        return player;
      });
    });
  }

  function addEntry(playerId: string, expression: string) {
    const evaluation = evaluateExpression(expression);

    if (evaluation.error || evaluation.value === null) {
      return evaluation;
    }

    const normalized = Number(evaluation.value.toFixed(4));

    updatePlayer(playerId, (player) => {
      const nextEntries = [
        createCommittedEntry(player.entries.length + 1, String(normalized), normalized),
        ...player.entries,
      ];

      return {
        ...player,
        entries: nextEntries,
        total: computeTotal(nextEntries),
      };
    });

    return { error: null, value: normalized };
  }

  function deleteEntry(playerId: string, entryId: string) {
    updatePlayer(playerId, (player) => {
      const nextEntries = player.entries.filter((entry) => entry.id !== entryId);

      return {
        ...player,
        entries: nextEntries,
        total: computeTotal(nextEntries),
      };
    });
  }

  function deletePlayer(playerId: string) {
    const nextPlayers = players.filter((player) => player.id !== playerId);

    setPlayers(nextPlayers);
    if (activePlayerId === playerId) {
      setActivePlayerId(nextPlayers[0]?.id ?? null);
    }
  }

  function resetPlayerScore(playerId: string) {
    updatePlayer(playerId, (player) => ({
      ...player,
      entries: [],
      total: 0,
    }));
  }

  function reset() {
    setPlayers([]);
    setActivePlayerId(null);
    setEditingSnapshotId(null);
    nextPlayerNumber.current = 1;
    nextColorIndex.current = 0;
  }

  function save() {
    if (players.length === 0) {
      return;
    }

    const snapshotId = editingSnapshotId ?? `snapshot-${Date.now()}`;
    const snapshotName =
      history.find((item) => item.id === editingSnapshotId)?.name ||
      `History #${history.length + 1}`;
    const snapshot: ScoreHistorySnapshot = {
      createdAt: new Date().toISOString(),
      id: snapshotId,
      name: snapshotName,
      players: sortedPlayers.map((player) => ({
        color: player.color,
        id: player.id,
        name: player.name.trim() || 'Player',
        total: player.total,
      })),
    };

    setHistory((current) => {
      if (editingSnapshotId) {
        return current.map((item) => (item.id === editingSnapshotId ? snapshot : item));
      }

      return [snapshot, ...current].slice(0, HISTORY_LIMIT);
    });
    setLastSavedSnapshotId(snapshotId);
    reset();
  }

  function deleteHistorySnapshot(snapshotId: string) {
    setHistory((current) => current.filter((snapshot) => snapshot.id !== snapshotId));
    if (editingSnapshotId === snapshotId) {
      setEditingSnapshotId(null);
    }
  }

  function renameHistorySnapshot(snapshotId: string, name: string) {
    const normalized = name.trim() || 'History';
    setHistory((current) =>
      current.map((snapshot) =>
        snapshot.id === snapshotId ? { ...snapshot, name: normalized.slice(0, 28) } : snapshot
      )
    );
  }

  function editHistorySnapshot(snapshotId: string) {
    const snapshot = history.find((item) => item.id === snapshotId);
    if (!snapshot) {
      return;
    }

    const restoredPlayers = snapshot.players.map((player, index) => ({
      color: player.color,
      entries: [
        createCommittedEntry(index + 1, String(player.total), player.total),
      ],
      id: player.id,
      name: normalizePlayerName(player.name),
      total: player.total,
    }));

    setPlayers(restoredPlayers);
    setActivePlayerId(restoredPlayers[0]?.id ?? null);
    setEditingSnapshotId(snapshot.id);
    nextPlayerNumber.current = restoredPlayers.length + 1;
    nextColorIndex.current = restoredPlayers.length;
  }

  return {
    activePlayerId,
    addEntry,
    addPlayer,
    deleteEntry,
    deleteHistorySnapshot,
    deletePlayer,
    editHistorySnapshot,
    editingSnapshotId,
    history,
    lastSavedSnapshotId,
    players,
    renameHistorySnapshot,
    renamePlayer,
    reset,
    resetPlayerScore,
    save,
    selectPlayer: setActivePlayerId,
    setPlayerColor,
    sortedPlayers,
  };
}
