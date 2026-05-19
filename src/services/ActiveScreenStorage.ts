import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACTIVE_SCREEN_STORAGE_KEY } from '../constants/game';
import type { AppScreen } from '../types/game';

export class ActiveScreenStorage {
  static async load(defaultScreen: AppScreen): Promise<AppScreen> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SCREEN_STORAGE_KEY);
      if (
        raw === 'first-player' ||
        raw === 'players-order' ||
        raw === 'dice' ||
        raw === 'coin' ||
        raw === 'players-score'
      ) {
        return raw;
      }
    } catch {
      // Ignore storage issues and keep the app usable.
    }

    return defaultScreen;
  }

  static async save(screen: AppScreen) {
    try {
      await AsyncStorage.setItem(ACTIVE_SCREEN_STORAGE_KEY, screen);
    } catch {
      // Ignore storage issues and keep the app usable.
    }
  }
}
