import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '../design/tokens';
import { ToastHost } from './ToastHost';

type DismissibleModalProps = {
  children: ReactNode;
  onDismiss: () => void;
  visible: boolean;
};

export function DismissibleModal({ children, onDismiss, visible }: DismissibleModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Dismiss modal" onPress={onDismiss} style={styles.backdrop} />
        <View pointerEvents="box-none" style={styles.content}>
          {children}
        </View>
        {visible ? <ToastHost /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
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
