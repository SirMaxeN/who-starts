import type { GestureResponderEvent } from 'react-native';
import type { TouchPoint } from '../types/game';

export function extractTouches(event: GestureResponderEvent): TouchPoint[] {
  const nextTouches = event.nativeEvent.touches ?? [];

  return Array.from(nextTouches).map((touch) => ({
    id: String(touch.identifier),
    x: touch.locationX,
    y: touch.locationY,
  }));
}
