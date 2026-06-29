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
          <View style={styles.confirmHeader}>
            <Text style={styles.confirmTitle}>Discard session?</Text>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Close discard confirmation"
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => setIsConfirmVisible(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          <Text style={styles.confirmCopy}>
            This will delete the current active session and return you to the Climb page. This cannot be undone.
          </Text>
          <View style={styles.actions}>
            <AppButton disabled={disabled} icon="trash-2" onPress={() => void handleDiscard()} title="Discard session" variant="destructive" />
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  confirmCopy: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  confirmHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  confirmTitle: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
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
