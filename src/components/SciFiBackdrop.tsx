import { StyleSheet, View } from 'react-native';
import { BACKGROUND_ORBS } from '../constants/game';

export function SciFiBackdrop() {
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

      <View style={[styles.ring, styles.ringLarge]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringMedium]} pointerEvents="none" />
      <View style={[styles.ring, styles.ringSmall]} pointerEvents="none" />

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
  ring: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 999,
    borderColor: 'rgba(105, 215, 255, 0.12)',
  },
  ringLarge: {
    top: '50%',
    width: 420,
    height: 420,
    marginTop: -210,
    borderWidth: 1,
  },
  ringMedium: {
    top: '50%',
    width: 300,
    height: 300,
    marginTop: -150,
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.10)',
  },
  ringSmall: {
    top: '50%',
    width: 190,
    height: 190,
    marginTop: -95,
    borderWidth: 1,
    borderColor: 'rgba(111, 241, 255, 0.16)',
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
