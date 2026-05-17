import type { RoundMode, TouchPoint } from '../types/game';
import { TOUCH_COLORS } from '../constants/game';

export function getModeLabel(mode: RoundMode) {
  return mode === 'manual' ? 'Manual' : `${mode / 1000}s`;
}

export function getTouchSignature(touches: TouchPoint[]) {
  return touches
    .map((touch) => `${touch.id}:${Math.round(touch.x)}:${Math.round(touch.y)}`)
    .sort()
    .join('|');
}

export function getTouchColor(id: string) {
  const hash = Array.from(id).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0
  );

  return TOUCH_COLORS[hash % TOUCH_COLORS.length];
}

export function pickWinner(touches: TouchPoint[]) {
  const winnerIndex = Math.floor(Math.random() * touches.length);
  return touches[winnerIndex] ?? null;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
