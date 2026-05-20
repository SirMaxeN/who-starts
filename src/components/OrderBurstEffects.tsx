import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { TouchPoint } from '../types/game';
import { getTouchColor } from '../utils/game';

export type OrderBurstEvent = {
  key: number;
  touch: TouchPoint;
};

type OrderBurstEffectsProps = {
  bursts: OrderBurstEvent[];
};

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function OrderBurstEffects({ bursts }: OrderBurstEffectsProps) {
  if (bursts.length === 0) {
    return null;
  }

  return (
    <>
      {bursts.map((burst) => (
        <OrderBurst key={burst.key} touch={burst.touch} />
      ))}
    </>
  );
}

function OrderBurst({ touch }: { touch: TouchPoint }) {
  const progress = useRef(new Animated.Value(0)).current;
  const color = getTouchColor(touch.id);
  const particles = useMemo(
    () => PARTICLE_ANGLES.map((angle, index) => ({ angle, index })),
    []
  );

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      progress.stopAnimation();
    };
  }, [progress]);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.burstFx,
        {
          transform: [
            { translateX: touch.x - 80 },
            { translateY: touch.y - 80 },
          ],
        },
      ]}
    >
      {particles.map((particle) => {
        const translate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 104],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.18, 1],
          outputRange: [0, 0.9, 0],
        });

        return (
          <Animated.View
            key={particle.index}
            style={[
              styles.burstParticle,
              {
                backgroundColor: color,
                opacity,
                shadowColor: color,
                transform: [
                  { rotate: `${particle.angle}deg` },
                  { translateY: Animated.multiply(translate, -1) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  burstFx: {
    position: 'absolute',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstParticle: {
    position: 'absolute',
    width: 6,
    height: 22,
    borderRadius: 999,
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
