import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BACKGROUND_ORBS } from '../constants/game';

type SciFiBackdropProps = {
  animationsEnabled?: boolean;
};

export function SciFiBackdrop({ animationsEnabled = true }: SciFiBackdropProps) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const driftC = useRef(new Animated.Value(0)).current;
  const orbitA = useRef(new Animated.Value(0)).current;
  const orbitB = useRef(new Animated.Value(0)).current;
  const orbitC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animatedValues = [driftA, driftB, driftC, orbitA, orbitB, orbitC];
    const runningAnimations: Animated.CompositeAnimation[] = [];
    let isCancelled = false;

    for (const value of animatedValues) {
      value.stopAnimation();
      value.setValue(0);
    }

    if (!animationsEnabled) {
      return;
    }

    const startLoop = (value: Animated.Value, duration: number) => {
      const run = () => {
        if (isCancelled) {
          return;
        }

        value.setValue(0);
        const animation = Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        });

        runningAnimations.push(animation);
        animation.start(({ finished }) => {
          const animationIndex = runningAnimations.indexOf(animation);
          if (animationIndex >= 0) {
            runningAnimations.splice(animationIndex, 1);
          }

          if (finished && !isCancelled) {
            run();
          }
        });
      };

      run();
    };

    startLoop(driftA, 22000);
    startLoop(driftB, 28000);
    startLoop(driftC, 34000);
    startLoop(orbitA, 26000);
    startLoop(orbitB, 34000);
    startLoop(orbitC, 42000);

    return () => {
      isCancelled = true;

      for (const animation of runningAnimations) {
        animation.stop();
      }

      driftA.stopAnimation();
      driftB.stopAnimation();
      driftC.stopAnimation();
      orbitA.stopAnimation();
      orbitB.stopAnimation();
      orbitC.stopAnimation();
    };
  }, [animationsEnabled, driftA, driftB, driftC, orbitA, orbitB, orbitC]);

  const asteroidATranslateX = driftA.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 520],
  });
  const asteroidATranslateY = driftA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 34],
  });
  const asteroidAOpacity = driftA.interpolate({
    inputRange: [0, 0.08, 0.82, 1],
    outputRange: [0, 0.1, 0.1, 0],
  });

  const asteroidBTranslateX = driftB.interpolate({
    inputRange: [0, 1],
    outputRange: [440, -180],
  });
  const asteroidBTranslateY = driftB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -24],
  });
  const asteroidBOpacity = driftB.interpolate({
    inputRange: [0, 0.08, 0.82, 1],
    outputRange: [0, 0.08, 0.08, 0],
  });

  const dustTranslateX = driftC.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 500],
  });
  const dustOpacity = driftC.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 0.06, 0.06, 0],
  });
  const orbitARotation = orbitA.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const orbitBRotation = orbitB.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const orbitCRotation = orbitC.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <View style={styles.base} pointerEvents="none" />
      <View style={styles.radialGlowA} pointerEvents="none" />
      <View style={styles.radialGlowB} pointerEvents="none" />
      <View style={styles.scanlines} pointerEvents="none" />
      <View style={styles.diagonalBeamA} pointerEvents="none" />
      <View style={styles.diagonalBeamB} pointerEvents="none" />

      {BACKGROUND_ORBS.map((orb, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={[
            styles.orb,
            {
              top: orb.top,
              right: orb.right,
              bottom: orb.bottom,
              left: orb.left,
              width: orb.size,
              height: orb.size,
              opacity: orb.opacity,
            },
          ]}
        />
      ))}

      {animationsEnabled ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.deepObject,
              styles.deepObjectA,
              {
                opacity: asteroidAOpacity,
                transform: [
                  { translateX: asteroidATranslateX },
                  { translateY: asteroidATranslateY },
                  { rotate: '-14deg' },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.deepObject,
              styles.deepObjectB,
              {
                opacity: asteroidBOpacity,
                transform: [
                  { translateX: asteroidBTranslateX },
                  { translateY: asteroidBTranslateY },
                  { rotate: '18deg' },
                ],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.deepDust,
              {
                opacity: dustOpacity,
                transform: [{ translateX: dustTranslateX }, { rotate: '-10deg' }],
              },
            ]}
          />
        </>
      ) : null}

      <View style={[styles.ring, styles.ringLarge]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringMedium]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringSmall]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringOffsetLeft]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringOffsetRight]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringOffsetTop]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringOffsetBottom]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringDashedLarge]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringDashedMedium]} pointerEvents="none" />
      <View style={[styles.ringArc, styles.ringArcLeft]} pointerEvents="none" />
      <View style={[styles.ringArc, styles.ringArcRight]} pointerEvents="none" />
      <View style={[styles.ringArc, styles.ringArcTop]} pointerEvents="none" />
      <View style={[styles.ringArc, styles.ringArcBottom]} pointerEvents="none" />

      {animationsEnabled ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.orbitTrack, styles.orbitTrackLeft, { transform: [{ rotate: orbitARotation }] }]}
          >
            <View style={[styles.orbitDot, styles.orbitDotCyan]} />
            <View style={[styles.orbitDot, styles.orbitDotPink, styles.orbitDotOpposite]} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.orbitTrack, styles.orbitTrackRight, { transform: [{ rotate: orbitBRotation }] }]}
          >
            <View style={[styles.orbitDot, styles.orbitDotBlue]} />
            <View style={[styles.orbitDot, styles.orbitDotSoft, styles.orbitDotQuarter]} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.orbitTrack, styles.orbitTrackCenter, { transform: [{ rotate: orbitCRotation }] }]}
          >
            <View style={[styles.orbitDot, styles.orbitDotTiny]} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.sweepTrack, { transform: [{ rotate: orbitARotation }] }]}
          >
            <View style={styles.sweepArc} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.sweepTrackOuter, { transform: [{ rotate: orbitBRotation }] }]}
          >
            <View style={styles.sweepArcOuter} />
          </Animated.View>
        </>
      ) : null}

      <View style={[styles.corner, styles.cornerTopLeft]} pointerEvents="none" />
      <View style={[styles.corner, styles.cornerTopRight]} pointerEvents="none" />
      <View style={[styles.corner, styles.cornerBottomLeft]} pointerEvents="none" />
      <View style={[styles.corner, styles.cornerBottomRight]} pointerEvents="none" />

      <View style={[styles.hudLine, styles.hudLineTop]} pointerEvents="none" />
      <View style={[styles.hudLine, styles.hudLineBottom]} pointerEvents="none" />
      <View style={[styles.hudLineVertical, styles.hudLineLeft]} pointerEvents="none" />
      <View style={[styles.hudLineVertical, styles.hudLineRight]} pointerEvents="none" />
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#02030A',
  },
  radialGlowA: {
    position: 'absolute',
    top: -160,
    left: -60,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(0, 209, 255, 0.12)',
  },
  radialGlowB: {
    position: 'absolute',
    right: -110,
    bottom: -160,
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(255, 58, 192, 0.10)',
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(122, 174, 255, 0.08)',
  },
  diagonalBeamA: {
    position: 'absolute',
    top: 120,
    left: -120,
    width: 320,
    height: 1,
    backgroundColor: 'rgba(77, 185, 255, 0.22)',
    transform: [{ rotate: '-24deg' }],
  },
  diagonalBeamB: {
    position: 'absolute',
    bottom: 170,
    right: -100,
    width: 280,
    height: 1,
    backgroundColor: 'rgba(255, 88, 193, 0.24)',
    transform: [{ rotate: '-24deg' }],
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#091225',
    borderWidth: 1,
    borderColor: 'rgba(113, 160, 255, 0.12)',
  },
  deepObject: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(173, 219, 255, 0.28)',
  },
  deepObjectA: {
    top: '18%',
    width: 68,
    height: 12,
  },
  deepObjectB: {
    bottom: '24%',
    width: 54,
    height: 10,
    backgroundColor: 'rgba(255, 187, 228, 0.2)',
  },
  deepDust: {
    position: 'absolute',
    top: '64%',
    width: 140,
    height: 2,
    backgroundColor: 'rgba(129, 205, 255, 0.18)',
  },
  ring: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 999,
    borderColor: 'rgba(105, 215, 255, 0.18)',
  },
  ringLarge: {
    top: '50%',
    width: 420,
    height: 420,
    marginTop: -210,
    borderWidth: 1,
    borderColor: 'rgba(111, 241, 255, 0.18)',
  },
  ringMedium: {
    top: '50%',
    width: 300,
    height: 300,
    marginTop: -150,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.16)',
  },
  ringSmall: {
    top: '50%',
    width: 190,
    height: 190,
    marginTop: -95,
    borderWidth: 1,
    borderColor: 'rgba(111, 241, 255, 0.24)',
  },
  ringOffsetLeft: {
    top: '26%',
    left: -34,
    width: 230,
    height: 230,
    borderWidth: 1,
    borderColor: 'rgba(109, 228, 255, 0.13)',
  },
  ringOffsetRight: {
    top: '18%',
    right: -62,
    width: 310,
    height: 310,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 214, 0.12)',
  },
  ringOffsetTop: {
    top: 78,
    alignSelf: 'center',
    width: 520,
    height: 520,
    borderWidth: 1,
    borderColor: 'rgba(118, 202, 255, 0.08)',
  },
  ringOffsetBottom: {
    bottom: -110,
    alignSelf: 'center',
    width: 430,
    height: 430,
    borderWidth: 1,
    borderColor: 'rgba(120, 240, 255, 0.09)',
  },
  ringDashedLarge: {
    top: '50%',
    width: 356,
    height: 356,
    marginTop: -178,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(124, 223, 255, 0.14)',
  },
  ringDashedMedium: {
    top: '50%',
    width: 248,
    height: 248,
    marginTop: -124,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 102, 218, 0.12)',
  },
  ringArc: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  ringArcLeft: {
    top: '32%',
    left: 32,
    width: 180,
    height: 180,
    borderColor: 'rgba(118, 230, 255, 0.15)',
  },
  ringArcRight: {
    bottom: '24%',
    right: 22,
    width: 220,
    height: 220,
    borderColor: 'rgba(255, 108, 216, 0.15)',
  },
  ringArcTop: {
    top: 116,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderColor: 'rgba(128, 212, 255, 0.11)',
  },
  ringArcBottom: {
    bottom: 92,
    alignSelf: 'center',
    width: 340,
    height: 340,
    borderColor: 'rgba(113, 236, 255, 0.1)',
  },
  orbitTrack: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbitTrackLeft: {
    top: '26%',
    left: -34,
    width: 230,
    height: 230,
  },
  orbitTrackRight: {
    top: '18%',
    right: -62,
    width: 310,
    height: 310,
  },
  orbitTrackCenter: {
    top: '50%',
    left: '50%',
    width: 420,
    height: 420,
    marginLeft: -210,
    marginTop: -210,
  },
  orbitDot: {
    position: 'absolute',
    top: -3,
    width: 6,
    height: 6,
    borderRadius: 999,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  orbitDotTiny: {
    top: -2,
    width: 4,
    height: 4,
    backgroundColor: 'rgba(137, 233, 255, 0.42)',
    shadowColor: '#8AEFFF',
  },
  orbitDotCyan: {
    backgroundColor: 'rgba(123, 239, 255, 0.5)',
    shadowColor: '#8BEFFF',
  },
  orbitDotPink: {
    backgroundColor: 'rgba(255, 125, 218, 0.42)',
    shadowColor: '#FF7DDA',
  },
  orbitDotBlue: {
    backgroundColor: 'rgba(132, 184, 255, 0.44)',
    shadowColor: '#84B8FF',
  },
  orbitDotSoft: {
    backgroundColor: 'rgba(194, 235, 255, 0.24)',
    shadowColor: '#C2EBFF',
  },
  orbitDotOpposite: {
    top: undefined,
    bottom: -3,
  },
  orbitDotQuarter: {
    top: '50%',
    right: -3,
    left: undefined,
    marginTop: -3,
  },
  sweepTrack: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    alignItems: 'center',
  },
  sweepTrackOuter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 420,
    height: 420,
    marginLeft: -210,
    marginTop: -210,
    alignItems: 'center',
  },
  sweepArc: {
    width: 2,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(115, 238, 255, 0.1)',
    shadowColor: '#8CF0FF',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  sweepArcOuter: {
    width: 1,
    height: 210,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 118, 218, 0.07)',
    shadowColor: '#FF76DA',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: 'rgba(111, 241, 255, 0.30)',
  },
  cornerTopLeft: {
    top: 24,
    left: 18,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTopRight: {
    top: 24,
    right: 18,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBottomLeft: {
    bottom: 24,
    left: 18,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBottomRight: {
    bottom: 24,
    right: 18,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  hudLine: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(96, 170, 255, 0.09)',
  },
  hudLineTop: {
    top: 86,
  },
  hudLineBottom: {
    bottom: 72,
  },
  hudLineVertical: {
    position: 'absolute',
    top: 112,
    bottom: 92,
    width: 1,
    backgroundColor: 'rgba(96, 170, 255, 0.08)',
  },
  hudLineLeft: {
    left: 30,
  },
  hudLineRight: {
    right: 30,
  },
});
