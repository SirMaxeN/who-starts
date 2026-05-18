import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { TouchPoint } from '../types/game';
import { getTouchColor } from '../utils/game';

type SelectionEffectsProps = {
  isChoosing: boolean;
  winner: TouchPoint | null;
  winnerBurstKey: number;
};

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function SelectionEffects({
  isChoosing,
  winner,
  winnerBurstKey,
}: SelectionEffectsProps) {
  const charge = useRef(new Animated.Value(0)).current;
  const chargeSpin = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isChoosing) {
      charge.stopAnimation();
      charge.setValue(0);
      chargeSpin.stopAnimation();
      chargeSpin.setValue(0);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(charge, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(charge, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(chargeSpin, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      charge.stopAnimation();
      chargeSpin.stopAnimation();
    };
  }, [charge, chargeSpin, isChoosing]);

  useEffect(() => {
    burst.stopAnimation();
    flash.stopAnimation();

    if (!winner) {
      burst.setValue(0);
      flash.setValue(0);
      return;
    }

    burst.setValue(0);
    flash.setValue(0);

    Animated.parallel([
      Animated.timing(burst, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(flash, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flash, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    return () => {
      burst.stopAnimation();
      flash.stopAnimation();
    };
  }, [burst, flash, winner, winnerBurstKey]);

  const spin = chargeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const chargeScale = charge.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  });

  const chargeOpacity = charge.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.55],
  });

  const winnerColor = winner ? getTouchColor(winner.id) : '#00F5FF';
  const burstRingScale = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 2.4],
  });
  const burstRingOpacity = burst.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.85, 0.5, 0],
  });
  const burstRingScaleSecondary = burst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 3.2],
  });
  const burstRingOpacitySecondary = burst.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.8, 0],
  });
  const flashOpacity = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.28],
  });

  const winnerParticles = useMemo(() => {
    if (!winner) {
      return [];
    }

    return PARTICLE_ANGLES.map((angle, index) => ({ angle, index }));
  }, [winner]);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.screenFlash, { opacity: flashOpacity, backgroundColor: winnerColor }]}
      />

      {isChoosing ? (
        <View pointerEvents="none" style={styles.centerFx}>
          <Animated.View
            style={[
              styles.chargeRing,
              {
                opacity: chargeOpacity,
                transform: [{ scale: chargeScale }, { rotate: spin }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.chargeRingOuter,
              {
                opacity: chargeOpacity,
                transform: [{ scale: chargeScale }, { rotate: spin }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.energyBeam,
              {
                opacity: chargeOpacity,
                transform: [{ rotate: spin }],
              },
            ]}
          />
        </View>
      ) : null}

      {winner ? (
        <View
          pointerEvents="none"
          style={[
            styles.winnerFx,
            {
              transform: [
                { translateX: winner.x - 80 },
                { translateY: winner.y - 80 },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.winnerRing,
              {
                borderColor: winnerColor,
                opacity: burstRingOpacity,
                transform: [{ scale: burstRingScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.winnerRingSecondary,
              {
                borderColor: `${winnerColor}AA`,
                opacity: burstRingOpacitySecondary,
                transform: [{ scale: burstRingScaleSecondary }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.winnerCoreGlow,
              {
                backgroundColor: `${winnerColor}33`,
                opacity: burstRingOpacitySecondary,
                transform: [{ scale: burstRingScale }],
              },
            ]}
          />
          {winnerParticles.map((particle) => {
            const translate = burst.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 112],
            });
            const opacity = burst.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 1, 0],
            });
            const scale = burst.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0.2, 1.3, 0.5],
            });

            return (
              <Animated.View
                key={particle.index}
                style={[
                  styles.particle,
                  {
                    backgroundColor: winnerColor,
                    opacity,
                    transform: [
                      { rotate: `${particle.angle}deg` },
                      { translateY: Animated.multiply(translate, -1) },
                      { scale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centerFx: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.55)',
  },
  chargeRingOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.4)',
    borderStyle: 'dashed',
  },
  energyBeam: {
    position: 'absolute',
    width: 340,
    height: 2,
    backgroundColor: 'rgba(0, 245, 255, 0.55)',
  },
  winnerFx: {
    position: 'absolute',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenFlash: {
    ...StyleSheet.absoluteFillObject,
  },
  winnerRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  winnerRingSecondary: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
  },
  winnerCoreGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 24,
    borderRadius: 999,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
});
