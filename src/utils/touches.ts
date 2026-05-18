import type { NativeSyntheticEvent, NativeTouchEvent } from 'react-native';
import type { SurfaceSize, TouchPoint } from '../types/game';
import { CENTER_PANEL_RADIUS, CENTER_PANEL_SIZE } from '../components/CenterPanel';
import {
  TOP_BAR_CHIP_HEIGHT,
  TOP_BAR_CHIP_WIDTH,
  TOP_BAR_ICON_SIZE,
  TOP_BAR_SIDE,
  TOP_BAR_TOP,
} from '../components/TopBar';

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

export function isInsideTopControlZone(
  x: number,
  y: number,
  surfaceSize: SurfaceSize
) {
  const top = TOP_BAR_TOP;
  const bottom = TOP_BAR_TOP + TOP_BAR_ICON_SIZE;

  const leftButtonLeft = TOP_BAR_SIDE;
  const leftButtonRight = leftButtonLeft + TOP_BAR_ICON_SIZE;

  const rightButtonRight = surfaceSize.width - TOP_BAR_SIDE;
  const rightButtonLeft = rightButtonRight - TOP_BAR_ICON_SIZE;

  const chipLeft = surfaceSize.width / 2 - TOP_BAR_CHIP_WIDTH / 2;
  const chipRight = chipLeft + TOP_BAR_CHIP_WIDTH;
  const chipTop = TOP_BAR_TOP + (TOP_BAR_ICON_SIZE - TOP_BAR_CHIP_HEIGHT) / 2;
  const chipBottom = chipTop + TOP_BAR_CHIP_HEIGHT;

  const inLeftButton =
    x >= leftButtonLeft && x <= leftButtonRight && y >= top && y <= bottom;
  const inRightButton =
    x >= rightButtonLeft && x <= rightButtonRight && y >= top && y <= bottom;
  const inChip = x >= chipLeft && x <= chipRight && y >= chipTop && y <= chipBottom;

  return inLeftButton || inRightButton || inChip;
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
