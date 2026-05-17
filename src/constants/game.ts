import type { BackgroundOrb, RoundMode } from '../types/game';

export const STORAGE_KEY = 'whostarts.round-mode';

export const MODE_OPTIONS: { label: string; value: RoundMode }[] = [
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
