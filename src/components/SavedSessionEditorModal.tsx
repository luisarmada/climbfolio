import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { ClimbingLocation, ClimbingLocationType } from '../domain/models';
import { getSessionDisplayName, sessionService } from '../features/sessions';
import { SessionSummary, sessionSummaryService } from '../features/summaries';
import { useToastStore } from '../features/toasts';
import { getErrorMessage } from '../utils/errorMessage';
import { inputLimits, limitInput } from '../utils/inputValidation';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { DismissibleModal } from './DismissibleModal';
import { getLocationTypeLabel, SessionLocationPickerModal } from './SessionLocationPickerModal';

type SavedSessionEditorModalProps = {
  onDeleted?: (sessionId: string) => void;
  onDismiss: () => void;
  onSaved?: (summary: SessionSummary) => void;
  summary: SessionSummary | null;
  visible: boolean;
};

type EditorMode = 'details' | 'location';

type SessionEditorDraft = {
  description: string;
  locationId: string | null;
  locationName: string;
  locationType: ClimbingLocationType | null;
  name: string;
};

function createDraft(summary: SessionSummary): SessionEditorDraft {
  return {
    description: summary.session.description ?? '',
    locationId: summary.session.locationId,
    locationName: summary.session.locationName ?? '',
    locationType: (summary.session.locationType as ClimbingLocationType | null) ?? null,
    name: summary.session.name ?? '',
  };
}

export function SavedSessionEditorModal({ onDeleted, onDismiss, onSaved, summary, visible }: SavedSessionEditorModalProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<SessionEditorDraft | null>(summary ? createDraft(summary) : null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<EditorMode>('details');
  const showError = useToastStore((state) => state.showError);
  const showSuccess = useToastStore((state) => state.showSuccess);

  useEffect(() => {
    if (visible && summary) {
      setDraft(createDraft(summary));
      setError(null);
      setIsDeleteConfirmVisible(false);
      setMode('details');
    }
  }, [summary, visible]);

  if (!summary || !draft) {
    return null;
  }

  const selectedLocationLabel = draft.locationName || 'No location selected';

  function handleDismiss() {
    setIsDeleteConfirmVisible(false);
    setMode('details');
    onDismiss();
  }

  function chooseLocation(location: ClimbingLocation | null) {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            locationId: location?.id ?? null,
            locationName: location?.name ?? '',
            locationType: location?.type ?? null,
          }
        : currentDraft,
    );
  }

  async function handleSave() {
    if (!summary || !draft) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await sessionService.updateSavedSession(summary.session.id, {
        description: draft.description,
        locationId: draft.locationName ? draft.locationId : null,
        locationName: draft.locationName,
        locationType: draft.locationName ? draft.locationType : null,
        name: draft.name,
      });

      const nextSummary = await sessionSummaryService.getSessionSummary(summary.session.id);

      if (nextSummary) {
        onSaved?.(nextSummary);
      }

      showSuccess('Session details saved');
      handleDismiss();
    } catch (saveError) {
      const message = getErrorMessage(saveError, 'Could not update this session.');
      setError(message);
      showError('Session was not saved', message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!summary) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await sessionService.deleteSavedSession(summary.session.id);
      setIsDeleteConfirmVisible(false);
      showSuccess('Session deleted');
      onDeleted?.(summary.session.id);
      handleDismiss();
    } catch (deleteError) {
      const message = getErrorMessage(deleteError, 'Could not delete this session.');
      setError(message);
      showError('Session was not deleted', message);
      setIsDeleteConfirmVisible(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DismissibleModal onDismiss={handleDismiss} visible={visible && mode === 'details'}>
        <AppCard style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleCopy}>
              <Text style={styles.modalTitle}>Edit session</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.modalSubtitle}>{getSessionDisplayName(summary.session)}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Close session editor"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleDismiss}
              style={styles.closeButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  accessibilityLabel="Session name"
                  maxLength={inputLimits.sessionName}
                  onChangeText={(name) =>
                    setDraft((currentDraft) =>
                      currentDraft ? { ...currentDraft, name: limitInput(name, inputLimits.sessionName) } : currentDraft,
                    )
                  }
                  placeholder={getSessionDisplayName(summary.session)}
                  placeholderTextColor={colors.muted}
                  style={styles.textInput}
                  value={draft.name}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  accessibilityLabel="Session description"
                  maxLength={inputLimits.sessionDescription}
                  multiline
                  onChangeText={(description) =>
                    setDraft((currentDraft) =>
                      currentDraft
                        ? { ...currentDraft, description: limitInput(description, inputLimits.sessionDescription) }
                        : currentDraft,
                    )
                  }
                  placeholder="Notes, beta, highlights, or anything worth remembering."
                  placeholderTextColor={colors.muted}
                  style={[styles.textInput, styles.descriptionInput]}
                  textAlignVertical="top"
                  value={draft.description}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TouchableOpacity
                  activeOpacity={0.76}
                  accessibilityLabel="Change saved session location"
                  accessibilityRole="button"
                  onPress={() => setMode('location')}
                  style={styles.locationSelector}
                >
                  <View style={styles.locationSelectorCopy}>
                    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationSelectorValue}>{selectedLocationLabel}</Text>
                    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.locationSelectorMeta}>
                      {draft.locationName && draft.locationType ? getLocationTypeLabel(draft.locationType) : 'Choose a saved location'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={19} color={colors.charcoal} />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.actions}>
                <AppButton
                  disabled={isSaving}
                  icon="check"
                  onPress={() => void handleSave()}
                  title={isSaving ? 'Saving...' : 'Save Details'}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.76}
                accessibilityLabel="Delete saved session"
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => setIsDeleteConfirmVisible(true)}
                style={[styles.deleteButton, isSaving && styles.disabled]}
              >
                <Feather name="trash-2" size={16} color="#B85A3B" />
                <Text style={styles.deleteButtonText}>Delete session</Text>
              </TouchableOpacity>
            </ScrollView>
        </AppCard>
      </DismissibleModal>

      <SessionLocationPickerModal
        includeNoLocation
        onCreateCustomGradeScale={() => {
          handleDismiss();
          router.push('/settings/climbing');
        }}
        onDismiss={() => setMode('details')}
        onOpenLocationSettings={() => {
          handleDismiss();
          router.push('/settings/locations');
        }}
        onSelectLocation={chooseLocation}
        selectedLocationId={draft.locationName ? draft.locationId : null}
        visible={visible && mode === 'location'}
      />

      <DismissibleModal onDismiss={() => setIsDeleteConfirmVisible(false)} visible={isDeleteConfirmVisible}>
        <AppCard style={styles.confirmCard}>
          <View style={styles.confirmHeader}>
            <Text style={styles.confirmTitle}>Delete session?</Text>
            <TouchableOpacity
              activeOpacity={0.76}
              accessibilityLabel="Close delete confirmation"
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => setIsDeleteConfirmVisible(false)}
              style={styles.closeButton}
            >
              <Feather name="x" size={18} color={colors.charcoal} />
            </TouchableOpacity>
          </View>
          <Text style={styles.confirmCopy}>This removes the saved session from history and statistics. This cannot be undone.</Text>
          <View style={styles.actions}>
            <AppButton
              disabled={isSaving}
              icon="trash-2"
              onPress={() => void handleDelete()}
              title={isSaving ? 'Deleting...' : 'Delete session'}
              variant="destructive"
            />
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  confirmCard: {
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  confirmCopy: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
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
    flex: 1,
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 27,
    marginBottom: spacing.sm,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  deleteButtonText: {
    color: '#B85A3B',
    fontFamily: fonts.extraBold,
    fontSize: 14,
    fontWeight: '800',
  },
  descriptionInput: {
    minHeight: 112,
    paddingTop: spacing.md,
  },
  disabled: {
    opacity: 0.48,
  },
  editorContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  errorText: {
    color: '#B85A3B',
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationSelector: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationSelectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationSelectorMeta: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  locationSelectorValue: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '800',
  },
  modalCard: {
    maxHeight: '100%',
    maxWidth: 460,
    padding: spacing.lg,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalSubtitle: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  modalTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 21,
    fontWeight: '800',
  },
  modalTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  textInput: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
