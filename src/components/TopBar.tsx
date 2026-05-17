import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RoundMode } from '../types/game';
import { getModeLabel } from '../utils/game';

type TopBarProps = {
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  roundMode: RoundMode;
};

export function TopBar({ onOpenHelp, onOpenSettings, roundMode }: TopBarProps) {
  return (
    <View pointerEvents="box-none" style={styles.topBar}>
      <Pressable onPress={onOpenHelp} style={styles.iconButton}>
        <Text style={styles.iconButtonText}>?</Text>
      </Pressable>
      <View style={styles.modeChip}>
        <Text style={styles.modeChipText}>{getModeLabel(roundMode)}</Text>
      </View>
      <Pressable onPress={onOpenSettings} style={styles.iconButton}>
        <Text style={styles.iconButtonText}>SET</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 52,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 12, 26, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255, 79, 216, 0.26)',
  },
  modeChipText: {
    color: '#F3FBFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
