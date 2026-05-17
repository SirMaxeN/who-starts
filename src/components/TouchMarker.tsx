import { StyleSheet, View } from 'react-native';
import type { SurfaceSize, TouchPoint } from '../types/game';
import { clamp, getTouchColor } from '../utils/game';

type TouchMarkerProps = {
  surfaceSize: SurfaceSize;
  touch: TouchPoint;
};

export function TouchMarker({ surfaceSize, touch }: TouchMarkerProps) {
  const color = getTouchColor(touch.id);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.touchWrap,
        {
          transform: [
            {
              translateX: clamp(touch.x - 46, -12, surfaceSize.width || touch.x),
            },
            {
              translateY: clamp(touch.y - 46, -12, surfaceSize.height || touch.y),
            },
          ],
        },
      ]}
    >
      <View style={[styles.touchHalo, { borderColor: color, shadowColor: color }]} />
      <View style={[styles.touchCore, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  touchWrap: {
    position: 'absolute',
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchHalo: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  touchCore: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});
