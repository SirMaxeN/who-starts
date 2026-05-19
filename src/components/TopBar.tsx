import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoundMode } from '../types/game';
import { getModeLabel } from '../utils/game';

export const TOP_BAR_TOP = 52;
export const TOP_BAR_SIDE = 18;
export const TOP_BAR_ICON_SIZE = 46;
export const TOP_BAR_CHIP_WIDTH = 118;
export const TOP_BAR_CHIP_HEIGHT = 44;

type TopBarProps = {
  contextDisabled?: boolean;
  contextLabel: string;
  onOpenHelp?: () => void;
  onOpenPremium?: () => void;
  onOpenModePicker: () => void;
  onOpenSettings: () => void;
  roundMode: RoundMode;
  showPremiumButton?: boolean;
};

export function TopBar({
  contextDisabled = false,
  contextLabel,
  onOpenHelp,
  onOpenPremium,
  onOpenModePicker,
  onOpenSettings,
  roundMode,
  showPremiumButton = false,
}: TopBarProps) {
  return (
    <View pointerEvents="box-none" style={styles.topBar}>
      <Pressable
        onPress={showPremiumButton ? onOpenPremium : onOpenHelp}
        style={styles.iconButton}
      >
        <Text style={showPremiumButton ? styles.premiumIcon : styles.iconButtonText}>
          {showPremiumButton ? '\u2726' : '?'}
        </Text>
      </Pressable>
      <Pressable
        disabled={contextDisabled}
        onPress={onOpenModePicker}
        style={[styles.modeChip, contextDisabled && styles.modeChipDisabled]}
      >
        <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.modeChipText}>
          {showPremiumButton ? contextLabel : getModeLabel(roundMode)}
        </Text>
      </Pressable>
      <Pressable onPress={onOpenSettings} style={styles.iconButton}>
        <Text style={styles.iconButtonIcon}>{'\u2699'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: TOP_BAR_TOP,
    left: TOP_BAR_SIDE,
    right: TOP_BAR_SIDE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
    elevation: 40,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 12, 26, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(97, 222, 255, 0.28)',
  },
  iconButtonText: {
    color: '#E9F7FF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  premiumIcon: {
    color: '#FFE992',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 79, 216, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  modeChip: {
    width: TOP_BAR_CHIP_WIDTH,
    minHeight: TOP_BAR_CHIP_HEIGHT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 12, 26, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.26)',
  },
  modeChipDisabled: {
    opacity: 0.78,
  },
  modeChipText: {
    color: '#F3FBFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  iconButtonIcon: {
    color: '#E9F7FF',
    fontSize: 20,
    fontWeight: '700',
  },
});
