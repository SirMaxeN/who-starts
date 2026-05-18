import type { ReactNode } from 'react';
import type { NativeSyntheticEvent, NativeTouchEvent } from 'react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type OverlayModalProps = {
  children: ReactNode;
  onClose: () => void;
  onTouchStart?: (event: NativeSyntheticEvent<NativeTouchEvent>) => void;
  title: string;
  visible: boolean;
};

export function OverlayModal({
  children,
  onClose,
  onTouchStart,
  title,
  visible,
}: OverlayModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} onTouchStart={onTouchStart} style={styles.modalBackdrop}>
        <Pressable onPress={() => undefined} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>
          </View>
          <View style={styles.modalBody}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 4, 12, 0.74)',
  },
  modalCard: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 28,
    paddingTop: 20,
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.28)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    color: '#F6FDFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  closeButtonText: {
    color: '#DDEFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalBody: {
    minHeight: 0,
    flexShrink: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
});
