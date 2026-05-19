import type { DimensionValue } from 'react-native';

export type RoundMode = 'manual' | 1000 | 2000 | 3000 | 5000 | 10000;

export type AppSettings = {
  animations: boolean;
  music: boolean;
  sounds: boolean;
};

export type TouchPoint = {
  id: string;
  x: number;
  y: number;
};

export type SurfaceSize = {
  height: number;
  width: number;
};

export type BackgroundOrb = {
  bottom?: DimensionValue;
  left?: DimensionValue;
  opacity: number;
  right?: DimensionValue;
  size: number;
  top?: DimensionValue;
};

export type AppScreen =
  | 'first-player'
  | 'players-order'
  | 'dice'
  | 'coin'
  | 'players-score';

export type ScreenOption = {
  label: string;
  value: string;
};

export type ScreenConfig = {
  chipLabel: string;
  helpLines: string[];
  premium: boolean;
  title: string;
};

export type DiceKind = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export type DiceHistoryEntry = {
  id: string;
  kind: DiceKind;
  result: number;
};

export type CoinMode = 'heads-tails' | 'yes-no';

export type CoinSide = 'Heads' | 'Tails' | 'Yes' | 'No';

export type CoinHistoryEntry = {
  id: string;
  result: CoinSide;
};

export type ScoreEntry = {
  id: string;
  error: string | null;
  expression: string;
  value: number | null;
};

export type ScorePlayer = {
  color: string;
  entries: ScoreEntry[];
  id: string;
  name: string;
  total: number;
};

export type ScoreHistorySnapshot = {
  createdAt: string;
  id: string;
  players: Array<{
    color: string;
    id: string;
    name: string;
    total: number;
  }>;
};
