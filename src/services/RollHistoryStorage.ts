import AsyncStorage from '@react-native-async-storage/async-storage';
import { COIN_HISTORY_STORAGE_KEY, DICE_HISTORY_STORAGE_KEY } from '../constants/game';
import type { CoinHistoryEntry, CoinMode, DiceHistoryEntry } from '../types/game';

export type CoinHistoryByMode = Record<CoinMode, CoinHistoryEntry[]>;

const EMPTY_COIN_HISTORY: CoinHistoryByMode = {
  'do-skip': [],
  'heads-tails': [],
  'left-right': [],
  'odd-even': [],
  'yes-no': [],
};

export class RollHistoryStorage {
  static async loadDice(): Promise<DiceHistoryEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(DICE_HISTORY_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isDiceHistoryEntry).slice(0, 10);
    } catch {
      return [];
    }
  }

  static async saveDice(history: DiceHistoryEntry[]) {
    try {
      await AsyncStorage.setItem(
        DICE_HISTORY_STORAGE_KEY,
        JSON.stringify(history.slice(0, 10))
      );
    } catch {
      // Ignore storage issues and keep the app usable.
    }
  }

  static async loadCoin(): Promise<CoinHistoryByMode> {
    try {
      const raw = await AsyncStorage.getItem(COIN_HISTORY_STORAGE_KEY);
      if (!raw) {
        return EMPTY_COIN_HISTORY;
      }

      const parsed = JSON.parse(raw) as Partial<CoinHistoryByMode>;

      return {
        'do-skip': Array.isArray(parsed['do-skip'])
          ? parsed['do-skip'].filter(isCoinHistoryEntry).slice(0, 10)
          : [],
        'heads-tails': Array.isArray(parsed['heads-tails'])
          ? parsed['heads-tails'].filter(isCoinHistoryEntry).slice(0, 10)
          : [],
        'left-right': Array.isArray(parsed['left-right'])
          ? parsed['left-right'].filter(isCoinHistoryEntry).slice(0, 10)
          : [],
        'odd-even': Array.isArray(parsed['odd-even'])
          ? parsed['odd-even'].filter(isCoinHistoryEntry).slice(0, 10)
          : [],
        'yes-no': Array.isArray(parsed['yes-no'])
          ? parsed['yes-no'].filter(isCoinHistoryEntry).slice(0, 10)
          : [],
      };
    } catch {
      return EMPTY_COIN_HISTORY;
    }
  }

  static async saveCoin(history: CoinHistoryByMode) {
    try {
      await AsyncStorage.setItem(
        COIN_HISTORY_STORAGE_KEY,
        JSON.stringify({
          'do-skip': history['do-skip'].slice(0, 10),
          'heads-tails': history['heads-tails'].slice(0, 10),
          'left-right': history['left-right'].slice(0, 10),
          'odd-even': history['odd-even'].slice(0, 10),
          'yes-no': history['yes-no'].slice(0, 10),
        })
      );
    } catch {
      // Ignore storage issues and keep the app usable.
    }
  }
}

function isDiceHistoryEntry(entry: unknown): entry is DiceHistoryEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const candidate = entry as Partial<DiceHistoryEntry>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.result === 'number' &&
    (candidate.kind === 'd4' ||
      candidate.kind === 'd6' ||
      candidate.kind === 'd8' ||
      candidate.kind === 'd10' ||
      candidate.kind === 'd12' ||
      candidate.kind === 'd20')
  );
}

function isCoinHistoryEntry(entry: unknown): entry is CoinHistoryEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const candidate = entry as Partial<CoinHistoryEntry>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.result === 'Heads' ||
      candidate.result === 'Tails' ||
      candidate.result === 'Yes' ||
      candidate.result === 'No' ||
      candidate.result === 'Do' ||
      candidate.result === 'Skip' ||
      candidate.result === 'Left' ||
      candidate.result === 'Right' ||
      candidate.result === 'Odd' ||
      candidate.result === 'Even')
  );
}
