import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../design/tokens';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';

type SessionDiscardSectionProps = {
  disabled?: boolean;
  display?: 'button' | 'text';
  onDiscard: () => Promise<void> | void;
  style?: StyleProp<ViewStyle>;
};

export function SessionDiscardSection({ disabled = false, display = 'button', onDiscard, style }: SessionDiscardSectionProps) {
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  async function handleDiscard() {
    setIsConfirmVisible(false);
    await onDiscard();
  }

  return (
    <>
      {display === 'text' ? (
        <TouchableOpacity
          activeOpacity={0.76}
          accessibilityLabel="Discard session"
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setIsConfirmVisible(true)}
          style={[styles.textButton, disabled && styles.disabled, style]}
        >
          <Feather name="trash-2" size={16} color="#B85A3B" />
          <Text style={styles.textButtonLabel}>Discard session</Text>
        </TouchableOpacity>
      ) : (
        <AppButton
          disabled={disabled}
          icon="trash-2"
          onPress={() => setIsConfirmVisible(true)}
          style={style}
          title="Discard session"
          variant="destructive"
        />
      )}

      <DismissibleModal onDismiss={() => setIsConfirmVisible(false)} visible={isConfirmVisible}>
        <AppCard style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Discard session?</Text>
          <Text style={styles.confirmCopy}>
            This will delete the current active session and return you to the Climb page. This cannot be undone.
          </Text>
          <View style={styles.actions}>
            <AppButton disabled={disabled} icon="trash-2" onPress={() => void handleDiscard()} title="Discard session" variant="destructive" />
            <AppButton disabled={disabled} icon="x" onPress={() => setIsConfirmVisible(false)} title="Cancel" variant="secondary" />
          </View>
        </AppCard>
      </DismissibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  confirmCard: {
    maxHeight: '100%',
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  confirmCopy: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  confirmTitle: {
    color: colors.charcoal,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
    marginBottom: spacing.sm,
  },
  disabled: {
    opacity: 0.48,
  },
  textButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  textButtonLabel: {
    color: '#B85A3B',
    fontSize: 15,
    fontWeight: '900',
  },
});
