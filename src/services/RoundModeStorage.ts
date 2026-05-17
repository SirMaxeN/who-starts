import AsyncStorage from '@react-native-async-storage/async-storage';
import { MODE_OPTIONS, STORAGE_KEY } from '../constants/game';
import type { RoundMode } from '../types/game';

export class RoundModeStorage {
  static async load(defaultMode: RoundMode): Promise<RoundMode> {
    try {
      const storedMode = await AsyncStorage.getItem(STORAGE_KEY);

      if (!storedMode) {
        return defaultMode;
      }

      if (storedMode === 'manual') {
        return 'manual';
      }

      const parsed = Number(storedMode) as RoundMode;
      if (MODE_OPTIONS.some((option) => option.value === parsed)) {
        return parsed;
      }
    } catch {
      // Ignore storage issues and keep the app usable.
    }

    return defaultMode;
  }

  static async save(mode: RoundMode) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(mode));
    } catch {
      // Ignore storage issues and keep the app usable.
    }
  }
}
