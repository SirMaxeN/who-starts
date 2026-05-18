import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { SurfaceSize, TouchPoint } from '../types/game';
import { clamp, getTouchColor } from '../utils/game';

type TouchMarkerProps = {
  animationsEnabled?: boolean;
  isChoosing?: boolean;
  label: string;
  surfaceSize: SurfaceSize;
  touch: TouchPoint;
  winnerId?: string | null;
};

export function TouchMarker({
  animationsEnabled = true,
  isChoosing = false,
  label,
  surfaceSize,
  touch,
  winnerId,
}: TouchMarkerProps) {
  const color = getTouchColor(touch.id);
  const isWinner = winnerId === touch.id;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const orbitAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const orbitValueRef = useRef(0);

  useEffect(() => {
    const listenerId = orbit.addListener(({ value }) => {
      orbitValueRef.current = value;
    });

    return () => {
      orbit.removeListener(listenerId);
    };
  }, [orbit]);

  useEffect(() => {
    const shouldPulse = (animationsEnabled && isChoosing) || isWinner;

    pulse.stopAnimation();

    if (!shouldPulse) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    pulse.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: isWinner ? 420 : 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: isWinner ? 420 : 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      pulse.stopAnimation();
    };
  }, [animationsEnabled, isChoosing, isWinner, pulse]);

  useEffect(() => {
    const shouldRotate = animationsEnabled || isWinner;
    const rotationDuration = isWinner ? 2400 : 7200;

    if (!shouldRotate) {
      orbitAnimationRef.current?.stop();
      orbitAnimationRef.current = null;
      orbitValueRef.current = 0;
      orbit.setValue(0);
      return;
    }

    orbitAnimationRef.current?.stop();
    orbitAnimationRef.current = null;

    const startOrbitLoop = (duration: number) => {
      const currentValue = orbitValueRef.current;
      const nextTurn = Math.floor(currentValue) + 1;
      const remainingTurn = Math.max(0.0001, nextTurn - currentValue);

      const animation = Animated.timing(orbit, {
        toValue: nextTurn,
        duration: Math.max(1, Math.round(duration * remainingTurn)),
        easing: Easing.linear,
        useNativeDriver: true,
      });

      orbitAnimationRef.current = animation;
      animation.start(({ finished }) => {
        if (!finished) {
          return;
        }

        orbitValueRef.current = nextTurn;
        startOrbitLoop(duration);
      });
    };

    startOrbitLoop(rotationDuration);

    return () => {
      orbitAnimationRef.current?.stop();
      orbitAnimationRef.current = null;
    };
  }, [animationsEnabled, isWinner, orbit]);

  const orbitRotate = Animated.modulo(orbit, 1).interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isWinner ? 1.18 : 1.08],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [isWinner ? 0.8 : 0.45, 1],
  });
  const trailOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, isWinner ? 0.45 : 0.24],
  });
  const topTagFloat = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, -16],
  });
  const bottomTagFloat = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 16],
  });

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
      <Animated.View
        style={[
          styles.trail,
          {
            backgroundColor: color,
            opacity: trailOpacity,
            transform: [{ rotate: orbitRotate }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.touchHalo,
          styles.touchHaloOuter,
          {
            borderColor: color,
            shadowColor: color,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.touchHalo,
          {
            borderColor: color,
            shadowColor: color,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <View style={[styles.touchCore, { backgroundColor: color }]} />
      <Animated.View
        style={[
          styles.labelOrbit,
          {
            borderColor: `${color}55`,
            transform: [{ rotate: orbitRotate }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.labelTag,
            styles.labelTagTop,
            {
              backgroundColor: `${color}22`,
              borderColor: color,
              transform: [{ translateY: topTagFloat }],
            },
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.labelText, { color }]}
          >
            {label}
          </Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.labelTag,
            styles.labelTagBottom,
            {
              backgroundColor: `${color}18`,
              borderColor: color,
              transform: [{ translateY: bottomTagFloat }, { rotate: '180deg' }],
            },
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.labelText, { color }]}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
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
  trail: {
    position: 'absolute',
    width: 22,
    height: 138,
    borderRadius: 999,
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
    width: 88,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelTagTop: {
    top: -12,
  },
  labelTagBottom: {
    bottom: -12,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
