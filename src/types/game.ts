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
