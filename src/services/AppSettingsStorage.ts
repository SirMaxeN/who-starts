import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../constants/game';
import type { AppSettings } from '../types/game';

export class AppSettingsStorage {
  static async load(): Promise<AppSettings> {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_SETTINGS;
      }

      const parsed = JSON.parse(raw) as Partial<AppSettings>;

      return {
        animations:
          typeof parsed.animations === 'boolean'
            ? parsed.animations
            : DEFAULT_SETTINGS.animations,
        haptics:
          typeof parsed.haptics === 'boolean' ? parsed.haptics : DEFAULT_SETTINGS.haptics,
        music:
          typeof parsed.music === 'boolean' ? parsed.music : DEFAULT_SETTINGS.music,
        sounds:
          typeof parsed.sounds === 'boolean' ? parsed.sounds : DEFAULT_SETTINGS.sounds,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static async save(settings: AppSettings) {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage issues and keep the app usable.
    }
  }
}
