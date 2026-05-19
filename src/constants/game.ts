import type {
  AppScreen,
  AppSettings,
  BackgroundOrb,
  CoinMode,
  DiceKind,
  RoundMode,
  ScreenConfig,
} from '../types/game';

export const STORAGE_KEY = 'whostarts.round-mode';
export const SETTINGS_STORAGE_KEY = 'whostarts.settings';
export const ACTIVE_SCREEN_STORAGE_KEY = 'whostarts.active-screen';
export const SCORE_HISTORY_STORAGE_KEY = 'whostarts.score-history';
export const PREMIUM_UNLOCKED = true;
export const DEFAULT_SETTINGS: AppSettings = {
  animations: true,
  music: true,
  sounds: true,
};

export const MODE_OPTIONS: { label: string; value: RoundMode }[] = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: 'Manual', value: 'manual' },
];

export const TOUCH_COLORS = [
  '#00F5FF',
  '#FF4FD8',
  '#9B6BFF',
  '#9DFF00',
  '#FFB800',
  '#FF6B3D',
  '#4D9BFF',
  '#FF5470',
];

export const BACKGROUND_ORBS: BackgroundOrb[] = [
  { top: '8%', left: '9%', size: 120, opacity: 0.16 },
  { top: '18%', right: '10%', size: 92, opacity: 0.12 },
  { top: '48%', left: '4%', size: 160, opacity: 0.08 },
  { bottom: '18%', right: '5%', size: 132, opacity: 0.13 },
  { bottom: '9%', left: '18%', size: 86, opacity: 0.11 },
];

export const SCREEN_ORDER: AppScreen[] = [
  'first-player',
  'players-order',
  'dice',
  'coin',
  'players-score',
];

export const DICE_OPTIONS: { label: string; value: DiceKind }[] = [
  { label: 'D4', value: 'd4' },
  { label: 'D6', value: 'd6' },
  { label: 'D8', value: 'd8' },
  { label: 'D10', value: 'd10' },
  { label: 'D12', value: 'd12' },
  { label: 'D20', value: 'd20' },
];

export const COIN_OPTIONS: { label: string; value: CoinMode }[] = [
  { label: 'Heads/Tails', value: 'heads-tails' },
  { label: 'Yes/No', value: 'yes-no' },
];

export const APP_SCREENS: Record<AppScreen, ScreenConfig> = {
  coin: {
    chipLabel: 'Coin',
    helpLines: [
      'Tap the center coin to flip it.',
      'Choose between Heads / Tails or Yes / No.',
      'The result lands after the flip animation finishes.',
      'Use it for quick decisions without leaving the app.',
    ],
    premium: true,
    title: 'Coin',
  },
  dice: {
    chipLabel: 'D6',
    helpLines: [
      'Swipe left or right to change the die type.',
      'Tap the center die to roll it.',
      'The latest results stay visible in a short session history.',
    ],
    premium: true,
    title: 'Dice',
  },
  'first-player': {
    chipLabel: '2s',
    helpLines: [
      'Put 2 or more fingers on the screen.',
      'In timed modes, adding or removing fingers restarts the countdown.',
      'In manual mode, press START when everyone is ready.',
      'One finger wins. Release all fingers to begin again.',
    ],
    premium: false,
    title: 'First Player',
  },
  'players-order': {
    chipLabel: 'Order',
    helpLines: [
      'Put 2 or more fingers on the screen.',
      'The round picks a full order for all players, not just one winner.',
      'Release all fingers to prepare the next chain.',
    ],
    premium: true,
    title: 'Players Order',
  },
  'players-score': {
    chipLabel: 'Score',
    helpLines: [
      'Add players with the + button and rename them anytime.',
      'You can enter single values or math like 2+2*3.',
      'Leaving a field calculates the result and updates totals instantly.',
      'Save stores a snapshot of the current table in local history.',
    ],
    premium: true,
    title: 'Players Score',
  },
};
