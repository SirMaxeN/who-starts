import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { TouchPoint } from '../types/game';
import { getTouchColor } from '../utils/game';
import { isTabletSize } from '../utils/layout';

const SkiaKit = require('@shopify/react-native-skia');
const { BlurMask, Canvas, LinearGradient, Path, Skia, vec } = SkiaKit;

const COMPACT_MARKER_SCALE = 1 / 2.3;
const COMPACT_MARKER_OFFSET = 56 * COMPACT_MARKER_SCALE;

type PlayersOrderOverlayProps = {
  animationsEnabled: boolean;
  order: TouchPoint[] | null;
  playerLabels: Record<string, string>;
};

type EnergyBeamProps = {
  animationsEnabled: boolean;
  distance: number;
  endColor: string;
  left: number;
  rotateDeg: number;
  startColor: string;
  top: number;
};

export function PlayersOrderOverlay({
  animationsEnabled,
  order,
}: PlayersOrderOverlayProps) {
  if (!order || order.length < 2) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {order.slice(0, -1).map((touch, index) => {
        const nextTouch = order[index + 1];
        const deltaX = nextTouch.x - touch.x;
        const deltaY = nextTouch.y - touch.y;
        const rawDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const markerOffset = getBeamMarkerOffset(rawDistance);
        const unitX = rawDistance === 0 ? 1 : deltaX / rawDistance;
        const unitY = rawDistance === 0 ? 0 : deltaY / rawDistance;
        const startX = touch.x + unitX * markerOffset;
        const startY = touch.y + unitY * markerOffset;
        const endX = nextTouch.x - unitX * markerOffset;
        const endY = nextTouch.y - unitY * markerOffset;
        const beamDeltaX = endX - startX;
        const beamDeltaY = endY - startY;
        const distance = Math.max(18, Math.sqrt(beamDeltaX * beamDeltaX + beamDeltaY * beamDeltaY));
        const midpointX = startX + beamDeltaX / 2;
        const midpointY = startY + beamDeltaY / 2;
        const angleDeg = (Math.atan2(beamDeltaY, beamDeltaX) * 180) / Math.PI;
        const startColor = getTouchColor(touch.id);
        const endColor = getTouchColor(nextTouch.id);

        return (
          <EnergyBeam
            animationsEnabled={animationsEnabled}
            distance={distance}
            endColor={endColor}
            key={`${touch.id}-${nextTouch.id}`}
            left={midpointX - distance / 2}
            rotateDeg={angleDeg}
            startColor={startColor}
            top={midpointY - 11}
          />
        );
      })}
    </View>
  );
}

function getBeamMarkerOffset(rawDistance: number) {
  return Math.min(COMPACT_MARKER_OFFSET, rawDistance * 0.35);
}

export function PlayersOrderPanel({
  order,
  playerLabels,
}: Pick<PlayersOrderOverlayProps, 'order' | 'playerLabels'>) {
  const { height, width } = useWindowDimensions();
  const isTablet = isTabletSize(width, height);

  if (!order || order.length < 1) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.orderList, isTablet && styles.orderListTablet]}>
      <Text style={styles.orderTitle}>Player Order</Text>
      <View style={styles.orderColumns}>
        {[order.slice(0, 5), order.slice(5, 10)].map((column, columnIndex) => (
          <View key={`order-column-${columnIndex}`} style={styles.orderColumn}>
            {column.map((touch, itemIndex) => {
              const index = columnIndex * 5 + itemIndex;
              return (
                <View key={touch.id} style={styles.orderRow}>
                  <Text style={styles.orderIndex}>{index + 1}</Text>
                  <View
                    style={[styles.orderDot, { backgroundColor: getTouchColor(touch.id) }]}
                  />
                  <Text numberOfLines={1} style={styles.orderLabel}>
                    {playerLabels[touch.id] ?? `Player ${index + 1}`}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function EnergyBeam({
  animationsEnabled,
  distance,
  endColor,
  left,
  rotateDeg,
  startColor,
  top,
}: EnergyBeamProps) {
  const drawProgress = useRef(new Animated.Value(animationsEnabled ? 0 : 1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    drawProgress.stopAnimation();

    if (!animationsEnabled) {
      drawProgress.setValue(1);
      return;
    }

    drawProgress.setValue(0);
    Animated.timing(drawProgress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animationsEnabled, drawProgress]);

  useEffect(() => {
    if (!animationsEnabled) {
      shimmer.stopAnimation();
      shimmer.setValue(0.5);
      return;
    }

    shimmer.setValue(0);
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    return () => {
      shimmerAnimation.stop();
    };
  }, [animationsEnabled, shimmer]);

  const jitterTop = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-0.7, 0.7, -0.2],
  });
  const jitterBottom = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, -0.5, 0.5],
  });
  const glowOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.18, 0.34, 0.22],
  });
  const visibleWidth = drawProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, distance],
  });
  const particleCount = Math.min(18, Math.max(8, Math.ceil(distance / 28)));

  return (
    <View
      style={[
        styles.beamWrap,
        {
          left,
          top,
          transform: [{ rotate: `${rotateDeg}deg` }],
          width: distance,
        },
      ]}
    >
      <Animated.View style={[styles.beamDrawMask, { width: visibleWidth }]}>
        <View style={{ width: distance }}>
          <View style={styles.beamClip}>
            <SkiaBeam distance={distance} endColor={endColor} startColor={startColor} />
            <Animated.View
              style={[
                styles.beamGlow,
                {
                  backgroundColor: startColor,
                  opacity: glowOpacity,
                  shadowColor: startColor,
                },
              ]}
            />
            <View style={styles.beamBase}>
              <View style={[styles.beamBaseHalf, { backgroundColor: startColor }]} />
              <View style={[styles.beamBaseHalf, { backgroundColor: endColor }]} />
            </View>
            <Animated.View
              style={[
                styles.distortionLine,
                styles.distortionLineTop,
                {
                  backgroundColor: startColor,
                  transform: [{ translateY: jitterTop }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.distortionLine,
                styles.distortionLineBottom,
                {
                  backgroundColor: endColor,
                  transform: [{ translateY: jitterBottom }],
                },
              ]}
            />
            {Array.from({ length: particleCount }).map((_, index) => (
              <TravellingParticle
                color={index % 3 === 0 ? startColor : endColor}
                delay={index * 115}
                distance={distance}
                duration={Math.max(1100, distance * 7)}
                enabled={animationsEnabled}
                key={`beam-particle-${index}`}
                size={index % 4 === 0 ? 2 : 1.5}
                y={index % 3 === 0 ? -1.5 : index % 3 === 1 ? 0 : 1.5}
              />
            ))}
            {Array.from({ length: particleCount + 8 }).map((_, index) => (
              <TravellingParticle
                color={index % 2 === 0 ? startColor : endColor}
                delay={index * 83}
                distance={distance}
                duration={Math.max(1300, distance * 8)}
                enabled={animationsEnabled}
                key={`beam-micro-${index}`}
                opacity={0.48}
                size={1}
                y={index % 2 === 0 ? -2 : 2}
              />
            ))}
            <View style={[styles.beamFineLine, { backgroundColor: endColor }]} />
          </View>
        </View>
      </Animated.View>
      <View style={[styles.beamNode, styles.beamNodeStart, { backgroundColor: startColor }]} />
      <View style={[styles.beamNode, styles.beamNodeEnd, { backgroundColor: endColor }]} />
    </View>
  );
}

type TravellingParticleProps = {
  color: string;
  delay: number;
  distance: number;
  duration: number;
  enabled: boolean;
  opacity?: number;
  size: number;
  y: number;
};

function TravellingParticle({
  color,
  delay,
  distance,
  duration,
  enabled,
  opacity = 0.82,
  size,
  y,
}: TravellingParticleProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();

    if (!enabled) {
      progress.setValue(0.5);
      return;
    }

    progress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delay, duration, enabled, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-size, distance + size],
  });
  const particleOpacity = progress.interpolate({
    inputRange: [0, 0.08, 0.92, 1],
    outputRange: [0, opacity, opacity, 0],
  });

  return (
    <Animated.View
      style={[
        styles.travellingParticle,
        {
          backgroundColor: color,
          height: size,
          opacity: particleOpacity,
          shadowColor: color,
          top: 5 + y,
          transform: [{ translateX }],
          width: size,
        },
      ]}
    />
  );
}

function SkiaBeam({
  distance,
  endColor,
  startColor,
}: {
  distance: number;
  endColor: string;
  startColor: string;
}) {
  const centerY = 4;
  const path = Skia.Path.Make();
  path.moveTo(0, centerY);
  path.cubicTo(distance * 0.25, centerY - 1, distance * 0.72, centerY + 1, distance, centerY);

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Path path={path} style="stroke" strokeCap="round" strokeWidth={4}>
        <LinearGradient
          colors={[`${startColor}00`, `${startColor}88`, `${endColor}88`, `${endColor}00`]}
          end={vec(distance, centerY)}
          start={vec(0, centerY)}
        />
        <BlurMask blur={5} style="solid" />
      </Path>
      <Path path={path} style="stroke" strokeCap="round" strokeWidth={1.6}>
        <LinearGradient
          colors={[`${startColor}22`, startColor, endColor, `${endColor}22`]}
          end={vec(distance, centerY)}
          start={vec(0, centerY)}
        />
      </Path>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  beamWrap: {
    position: 'absolute',
    height: 16,
    justifyContent: 'center',
  },
  beamDrawMask: {
    overflow: 'hidden',
  },
  beamClip: {
    height: 8,
    borderRadius: 999,
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.018)',
  },
  beamGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 999,
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  beamBase: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    opacity: 0.08,
  },
  beamBaseHalf: {
    flex: 1,
  },
  travellingParticle: {
    position: 'absolute',
    left: 0,
    borderRadius: 999,
    shadowOpacity: 0.82,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  beamFineLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 3,
    height: 1,
    borderRadius: 999,
    opacity: 0.62,
  },
  distortionLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 1,
    borderRadius: 999,
    opacity: 0.28,
  },
  distortionLineTop: {
    top: 1,
  },
  distortionLineBottom: {
    bottom: 1,
  },
  beamNode: {
    position: 'absolute',
    top: 5,
    width: 6,
    height: 6,
    borderRadius: 999,
    shadowOpacity: 0.75,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  beamNodeStart: {
    left: -3,
  },
  beamNodeEnd: {
    right: -3,
  },
  orderList: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 56,
    zIndex: 200,
    elevation: 200,
    maxHeight: 184,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(3, 8, 18, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.42)',
    gap: 8,
    shadowColor: '#00E4FF',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  orderListTablet: {
    alignSelf: 'center',
    left: undefined,
    right: undefined,
    width: '72%',
    maxWidth: 680,
    bottom: 64,
  },
  orderColumns: {
    flexDirection: 'row',
    gap: 14,
  },
  orderColumn: {
    flex: 1,
    gap: 8,
  },
  orderTitle: {
    color: '#89EEFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIndex: {
    width: 24,
    color: '#8FB3D8',
    fontSize: 14,
    fontWeight: '700',
  },
  orderDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  orderLabel: {
    flex: 1,
    color: '#F4FBFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
