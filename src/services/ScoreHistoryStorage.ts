import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCORE_HISTORY_STORAGE_KEY } from '../constants/game';
import type { ScoreHistorySnapshot } from '../types/game';

export class ScoreHistoryStorage {
  static async load(): Promise<ScoreHistorySnapshot[]> {
    try {
      const raw = await AsyncStorage.getItem(SCORE_HISTORY_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((snapshot): snapshot is ScoreHistorySnapshot => {
        if (!snapshot || typeof snapshot !== 'object') {
          return false;
        }

        const candidate = snapshot as Partial<ScoreHistorySnapshot>;
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.createdAt === 'string' &&
          Array.isArray(candidate.players)
        );
        })
        .map((snapshot, index) => ({
          ...snapshot,
          name: snapshot.name || `History #${index + 1}`,
        }));
    } catch {
      return [];
    }
  }

  static async save(snapshots: ScoreHistorySnapshot[]) {
    try {
      await AsyncStorage.setItem(SCORE_HISTORY_STORAGE_KEY, JSON.stringify(snapshots));
    } catch {
      // Ignore storage issues and keep the app usable.
    }
  }
}
