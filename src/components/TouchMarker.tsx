import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { SurfaceSize, TouchPoint } from '../types/game';
import { clamp, getTouchColor } from '../utils/game';
import { getTabletScale } from '../utils/layout';

const STANDARD_ORBIT_DURATION_MS = 7200;
const BOOSTED_ORBIT_DURATION_MS = 1700;
const COMPACT_MARKER_SCALE = 1 / 2.3;
export const COMPACT_MARKER_DURATION_MS = 620;

type TouchMarkerProps = {
  animationsEnabled?: boolean;
  compact?: boolean;
  isChoosing?: boolean;
  label: string;
  surfaceSize: SurfaceSize;
  touch: TouchPoint;
  winnerId?: string | null;
};

export function TouchMarker({
  animationsEnabled = true,
  compact = false,
  isChoosing = false,
  label,
  surfaceSize,
  touch,
  winnerId,
}: TouchMarkerProps) {
  const { height, width } = useWindowDimensions();
  const tabletScale = getTabletScale(width, height);
  const markerSize = 92 * tabletScale;
  const markerRadius = markerSize / 2;
  const outerSize = 112 * tabletScale;
  const coreSize = 26 * tabletScale;
  const trailWidth = 22 * tabletScale;
  const trailHeight = 138 * tabletScale;
  const orbitSize = 132 * tabletScale;
  const tagWidth = 88 * tabletScale;
  const color = getTouchColor(touch.id);
  const isWinner = winnerId === touch.id;
  const compactScale = useRef(new Animated.Value(compact ? COMPACT_MARKER_SCALE : 1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const orbitAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const boostedOrbitIdRef = useRef<string | null>(null);
  const orbitValueRef = useRef(0);

  useEffect(() => {
    if (!animationsEnabled) {
      compactScale.stopAnimation();
      compactScale.setValue(compact ? COMPACT_MARKER_SCALE : 1);
      return;
    }

    Animated.timing(compactScale, {
      toValue: compact ? COMPACT_MARKER_SCALE : 1,
      duration: compact ? COMPACT_MARKER_DURATION_MS : 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animationsEnabled, compact, compactScale]);

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

    if (!shouldRotate) {
      orbitAnimationRef.current?.stop();
      orbitAnimationRef.current = null;
      boostedOrbitIdRef.current = null;
      orbitValueRef.current = 0;
      orbit.setValue(0);
      return;
    }

    orbitAnimationRef.current?.stop();
    orbitAnimationRef.current = null;
    const shouldBoost = isWinner && boostedOrbitIdRef.current !== winnerId;

    if (shouldBoost) {
      boostedOrbitIdRef.current = winnerId ?? null;
    }

    const startOrbitTurn = (duration: number, nextDuration?: number) => {
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
        startOrbitTurn(nextDuration ?? duration);
      });
    };

    startOrbitTurn(
      shouldBoost ? BOOSTED_ORBIT_DURATION_MS : STANDARD_ORBIT_DURATION_MS,
      STANDARD_ORBIT_DURATION_MS
    );

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
          width: markerSize,
          height: markerSize,
        },
        {
          transform: [
            {
              translateX: clamp(touch.x - markerRadius, -12, surfaceSize.width || touch.x),
            },
            {
              translateY: clamp(touch.y - markerRadius, -12, surfaceSize.height || touch.y),
            },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.scaleLayer,
          {
            width: markerSize,
            height: markerSize,
          },
          { transform: [{ scale: compactScale }] },
        ]}
      >
        <Animated.View
          style={[
          styles.trail,
          {
            backgroundColor: color,
            width: trailWidth,
            height: trailHeight,
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
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
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
              width: markerSize,
              height: markerSize,
              borderRadius: markerRadius,
              shadowColor: color,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <View
          style={[
            styles.touchCore,
            {
              backgroundColor: color,
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.labelOrbit,
            {
              borderColor: `${color}55`,
              width: orbitSize,
              height: orbitSize,
              borderRadius: orbitSize / 2,
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
                width: tagWidth,
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
                width: tagWidth,
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
  scaleLayer: {
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
