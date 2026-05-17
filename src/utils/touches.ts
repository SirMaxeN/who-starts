import type { NativeSyntheticEvent, NativeTouchEvent } from 'react-native';
import type { SurfaceSize, TouchPoint } from '../types/game';
import { CENTER_PANEL_RADIUS, CENTER_PANEL_SIZE } from '../components/CenterPanel';

export function isInsideCenterZone(
  x: number,
  y: number,
  surfaceSize: SurfaceSize
) {
  const centerLeft = surfaceSize.width / 2 - CENTER_PANEL_RADIUS;
  const centerTop = surfaceSize.height / 2 - CENTER_PANEL_RADIUS;
  const centerRight = centerLeft + CENTER_PANEL_SIZE;
  const centerBottom = centerTop + CENTER_PANEL_SIZE;

  return x >= centerLeft && x <= centerRight && y >= centerTop && y <= centerBottom;
}

export function mapTouches(
  event: NativeSyntheticEvent<NativeTouchEvent>
): TouchPoint[] {
  const nextTouches = event.nativeEvent.touches ?? [];

  return Array.from(nextTouches).map((touch) => ({
    id: String(touch.identifier),
    x: touch.pageX,
    y: touch.pageY,
  }));
}

export function mapChangedTouchIds(
  event: NativeSyntheticEvent<NativeTouchEvent>
) {
  const changedTouches = event.nativeEvent.changedTouches ?? [];

  return Array.from(changedTouches).map((touch) => ({
    id: String(touch.identifier),
    x: touch.pageX,
    y: touch.pageY,
  }));
}
