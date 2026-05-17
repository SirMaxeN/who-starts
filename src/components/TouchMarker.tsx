import { StyleSheet, Text, View } from 'react-native';
import type { SurfaceSize, TouchPoint } from '../types/game';
import { clamp, getTouchColor } from '../utils/game';

type TouchMarkerProps = {
  label: string;
  surfaceSize: SurfaceSize;
  touch: TouchPoint;
  winnerId?: string | null;
};

export function TouchMarker({ label, surfaceSize, touch, winnerId }: TouchMarkerProps) {
  const color = getTouchColor(touch.id);
  const isWinner = winnerId === touch.id;

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
      <View
        style={[
          styles.touchHalo,
          styles.touchHaloOuter,
          {
            borderColor: color,
            shadowColor: color,
            opacity: isWinner ? 0.95 : 0.7,
          },
        ]}
      />
      <View
        style={[
          styles.touchHalo,
          {
            borderColor: color,
            shadowColor: color,
            transform: [{ scale: isWinner ? 1.06 : 1 }],
          },
        ]}
      />
      <View style={[styles.touchCore, { backgroundColor: color }]} />
      <View style={[styles.labelOrbit, { borderColor: `${color}55` }]}>
        <View style={[styles.labelTag, { backgroundColor: `${color}22`, borderColor: color }]}>
          <Text style={[styles.labelText, { color }]}>{label}</Text>
        </View>
      </View>
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
  touchHaloOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  touchCore: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  labelOrbit: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  labelTag: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
