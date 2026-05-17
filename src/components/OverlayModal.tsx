import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type OverlayModalProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

export function OverlayModal({
  children,
  onClose,
  title,
  visible,
}: OverlayModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
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
    padding: 24,
    justifyContent: 'center',
    backgroundColor: 'rgba(1, 4, 12, 0.74)',
  },
  modalCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#07111F',
    borderWidth: 1,
    borderColor: 'rgba(95, 230, 255, 0.28)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    gap: 12,
  },
});
