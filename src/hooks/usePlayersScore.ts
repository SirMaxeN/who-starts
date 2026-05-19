import { useEffect, useMemo, useRef, useState } from 'react';
import { TOUCH_COLORS } from '../constants/game';
import { ScoreHistoryStorage } from '../services/ScoreHistoryStorage';
import type { ScoreEntry, ScoreHistorySnapshot, ScorePlayer } from '../types/game';
import { evaluateExpression } from '../utils/expression';

const HISTORY_LIMIT = 20;

function createEntry(index: number): ScoreEntry {
  return {
    error: null,
    expression: '',
    id: `entry-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    value: null,
  };
}

function computeTotal(entries: ScoreEntry[]) {
  return entries.reduce((sum, entry) => sum + (entry.value ?? 0), 0);
}

export function usePlayersScore() {
  const [players, setPlayers] = useState<ScorePlayer[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<ScoreHistorySnapshot[]>([]);
  const nextPlayerNumber = useRef(1);
  const nextColorIndex = useRef(0);
  const hasLoadedHistory = useRef(false);

  useEffect(() => {
    let isMounted = true;

    ScoreHistoryStorage.load().then((snapshots) => {
      if (isMounted) {
        setHistory(snapshots);
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
    const playerNumber = nextPlayerNumber.current;
    nextPlayerNumber.current += 1;

    const player: ScorePlayer = {
      color: TOUCH_COLORS[nextColorIndex.current % TOUCH_COLORS.length],
      entries: [createEntry(playerNumber)],
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
      name,
    }));
  }

  function changeEntry(playerId: string, entryId: string, expression: string) {
    updatePlayer(playerId, (player) => ({
      ...player,
      entries: player.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              error: null,
              expression,
            }
          : entry
      ),
    }));
  }

  function commitEntry(playerId: string, entryId: string) {
    updatePlayer(playerId, (player) => {
      const nextEntries = player.entries.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        if (!entry.expression.trim()) {
          return {
            ...entry,
            error: null,
            value: null,
          };
        }

        const evaluation = evaluateExpression(entry.expression);
        if (evaluation.error) {
          return {
            ...entry,
            error: evaluation.error,
            value: null,
          };
        }

        const normalizedSource = evaluation.value;
        if (normalizedSource === null) {
          return {
            ...entry,
            error: 'Invalid expression.',
            value: null,
          };
        }

        const normalized = Number(normalizedSource.toFixed(4));
        return {
          ...entry,
          error: null,
          expression: String(normalized),
          value: normalized,
        };
      });

      const lastEntry = nextEntries[nextEntries.length - 1];
      if (lastEntry && lastEntry.expression.trim()) {
        nextEntries.push(createEntry(nextEntries.length + 1));
      }

      return {
        ...player,
        entries: nextEntries,
        total: computeTotal(nextEntries),
      };
    });
  }

  function reset() {
    setPlayers([]);
    setActivePlayerId(null);
    nextPlayerNumber.current = 1;
    nextColorIndex.current = 0;
  }

  function save() {
    if (players.length === 0) {
      return;
    }

    const snapshot: ScoreHistorySnapshot = {
      createdAt: new Date().toISOString(),
      id: `snapshot-${Date.now()}`,
      players: sortedPlayers.map((player) => ({
        color: player.color,
        id: player.id,
        name: player.name.trim() || 'Player',
        total: player.total,
      })),
    };

    setHistory((current) => [snapshot, ...current].slice(0, HISTORY_LIMIT));
  }

  return {
    activePlayerId,
    addPlayer,
    changeEntry,
    commitEntry,
    history,
    players,
    renamePlayer,
    reset,
    save,
    selectPlayer: setActivePlayerId,
    sortedPlayers,
  };
}
