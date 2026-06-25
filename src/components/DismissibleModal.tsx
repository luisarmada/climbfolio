import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { spacing } from '../design/tokens';

type DismissibleModalProps = {
  children: ReactNode;
  onDismiss: () => void;
  visible: boolean;
};

export function DismissibleModal({ children, onDismiss, visible }: DismissibleModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible={visible}>
      <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.overlay}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.content}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    maxHeight: '86%',
    width: '100%',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.34)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});
