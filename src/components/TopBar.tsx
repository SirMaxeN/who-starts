import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoundMode } from '../types/game';
import { getModeLabel } from '../utils/game';

export const TOP_BAR_TOP = 52;
export const TOP_BAR_SIDE = 18;
export const TOP_BAR_ICON_SIZE = 46;
export const TOP_BAR_ACTION_WIDTH = 92;
export const TOP_BAR_CHIP_WIDTH = 118;
export const TOP_BAR_CHIP_HEIGHT = 44;

type TopBarProps = {
  contextDisabled?: boolean;
  contextLabel: string;
  onOpenHelp?: () => void;
  onOpenPremium?: () => void;
  onOpenModePicker: () => void;
  onOpenSettings: () => void;
  premiumUnlocked?: boolean;
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
  premiumUnlocked = false,
  roundMode,
  showPremiumButton = false,
}: TopBarProps) {
  const leftActionLabel = premiumUnlocked ? '' : 'Premium';
  const leftActionIcon = premiumUnlocked ? '\u2630' : '\u2655';

  return (
    <View pointerEvents="box-none" style={styles.topBar}>
      <View style={styles.actionSlot}>
        <Pressable
          onPress={showPremiumButton ? onOpenPremium : onOpenHelp}
          style={
            showPremiumButton
              ? [styles.actionButton, premiumUnlocked && styles.toolsActionButton]
              : styles.iconButton
          }
        >
          {showPremiumButton ? (
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              numberOfLines={1}
              style={[
                styles.actionButtonText,
                premiumUnlocked && styles.toolsActionButtonText,
                !premiumUnlocked && styles.premiumActionButtonText,
              ]}
            >
              <Text style={styles.actionButtonIcon}>{leftActionIcon}</Text>
              {leftActionLabel ? ` ${leftActionLabel}` : ''}
            </Text>
          ) : (
            <Text style={styles.iconButtonText}>?</Text>
          )}
        </Pressable>
      </View>
      <Pressable
        disabled={contextDisabled}
        onPress={onOpenModePicker}
        style={[styles.modeChip, contextDisabled && styles.modeChipDisabled]}
      >
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.52}
          numberOfLines={1}
          style={styles.modeChipText}
        >
          {showPremiumButton ? contextLabel : getModeLabel(roundMode)}
        </Text>
      </Pressable>
      <View style={[styles.actionSlot, styles.actionSlotRight]}>
        <Pressable onPress={onOpenSettings} style={styles.iconButton}>
          <Text style={styles.iconButtonIcon}>{'\u2699'}</Text>
        </Pressable>
      </View>
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
  actionSlot: {
    width: TOP_BAR_ACTION_WIDTH,
  },
  actionSlotRight: {
    alignItems: 'flex-end',
  },
  actionButton: {
    width: TOP_BAR_ACTION_WIDTH,
    height: TOP_BAR_ICON_SIZE,
    borderRadius: TOP_BAR_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(8, 12, 26, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(97, 222, 255, 0.28)',
  },
  toolsActionButton: {
    width: TOP_BAR_ICON_SIZE,
  },
  toolsActionButtonText: {
    fontSize: 20,
    lineHeight: 24,
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
  actionButtonText: {
    color: '#E9F7FF',
    fontSize: 13,
    fontWeight: '800',
    includeFontPadding: false,
    letterSpacing: 0.4,
    lineHeight: 17,
    textAlign: 'center',
    textAlignVertical: 'center',
    textTransform: 'uppercase',
    width: '100%',
  },
  actionButtonIcon: {
    fontSize: 13,
    lineHeight: 17,
  },
  premiumActionButtonText: {
    color: '#FFE992',
    textShadowColor: 'rgba(255, 79, 216, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  modeChip: {
    width: TOP_BAR_CHIP_WIDTH,
    height: TOP_BAR_CHIP_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: 'rgba(8, 12, 26, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.26)',
    justifyContent: 'center',
  },
  modeChipDisabled: {
    opacity: 0.78,
  },
  modeChipText: {
    color: '#F3FBFF',
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: false,
    letterSpacing: 1.1,
    lineHeight: 18,
    textTransform: 'uppercase',
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  iconButtonIcon: {
    color: '#E9F7FF',
    fontSize: 20,
    fontWeight: '700',
  },
});
