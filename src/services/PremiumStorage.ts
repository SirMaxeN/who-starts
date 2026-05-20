import AsyncStorage from '@react-native-async-storage/async-storage';
import { PREMIUM_STORAGE_KEY } from '../constants/game';

export class PremiumStorage {
  static async load(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(PREMIUM_STORAGE_KEY)) === 'unlocked';
    } catch {
      return false;
    }
  }

  static async saveUnlocked() {
    try {
      await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, 'unlocked');
    } catch {
      // Keep the in-memory entitlement active even if local storage is unavailable.
    }
  }
}
