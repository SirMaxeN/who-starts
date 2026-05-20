export function getDeviceClass(width: number, height: number) {
  const shortestSide = Math.min(width, height);

  if (shortestSide >= 760) {
    return 'largeTablet' as const;
  }

  if (shortestSide >= 600) {
    return 'tablet' as const;
  }

  return 'phone' as const;
}

export function getTabletScale(width: number, height: number) {
  const deviceClass = getDeviceClass(width, height);

  if (deviceClass === 'largeTablet') {
    return 1.18;
  }

  if (deviceClass === 'tablet') {
    return 1.08;
  }

  return 1;
}

export function isTabletSize(width: number, height: number) {
  return getDeviceClass(width, height) !== 'phone';
}
