import { useEffect, useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { SessionDiscardSection } from '../components/SessionDiscardSection';
import { SessionLiveStatsRow } from '../components/SessionLiveStatsRow';
import { colors, radius, spacing, typography } from '../design/tokens';
import { warmUpHoldType } from '../features/climbs';
import { getDefaultSessionName, useActiveSessionStore } from '../features/sessions';
import { formatSessionDate, formatSessionTime } from '../features/summaries';
import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { getMainFeature } from '../components/HoldIcon';

type EndSessionMode = 'default' | 'sent' | 'anotherTime' | 'discard';

type SessionFinalizationDraft = {
  description: string;
  name: string;
};

function formatSessionDurationWords(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${hours}hr ${minutes}min`;
}

export function SessionFinishScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const entryProgress = useRef(new Animated.Value(1)).current;
  const activeClimb = useActiveSessionStore((state) => state.activeClimb);
  const activeSession = useActiveSessionStore((state) => state.activeSession);
  const discardActiveClimb = useActiveSessionStore((state) => state.discardActiveClimb);
  const discardSession = useActiveSessionStore((state) => state.discardSession);
  const endSession = useActiveSessionStore((state) => state.endSession);
  const error = useActiveSessionStore((state) => state.error);
  const finishActiveClimb = useActiveSessionStore((state) => state.finishActiveClimb);
  const isLoading = useActiveSessionStore((state) => state.isLoading);
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);
  const totals = useActiveSessionStore((state) => state.totals);
  const elapsedSeconds = useElapsedSeconds(activeSession?.startTime);
  const activeSessionId = activeSession?.id ?? null;
  const activeClimbMainFeature = activeClimb ? getMainFeature(activeClimb.holdTypes.filter((holdType) => holdType !== warmUpHoldType)) : undefined;
  const canSaveActiveClimbResult = Boolean(activeClimbMainFeature);
  const [hasRestoreSettled, setHasRestoreSettled] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [sessionFinalizationDraft, setSessionFinalizationDraft] = useState<SessionFinalizationDraft>({
    description: '',
    name: '',
  });
  const [defaultSessionNamePreview, setDefaultSessionNamePreview] = useState(getDefaultSessionName());

  useEffect(() => {
    entryProgress.setValue(1);
    Animated.timing(entryProgress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [entryProgress]);

  useEffect(() => {
    let isMounted = true;

    setHasRestoreSettled(false);

    void restoreActiveSession().finally(() => {
      if (isMounted) {
        setHasRestoreSettled(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [restoreActiveSession]);

  useEffect(() => {
    if (!hasRestoreSettled || activeSession) {
      return;
    }

    router.replace('/climb');
  }, [activeSession, hasRestoreSettled, router]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    setSessionFinalizationDraft({
      description: activeSession.description ?? '',
      name: activeSession.name ?? '',
    });
    setDefaultSessionNamePreview(getDefaultSessionName());
    setFinishError(null);
  }, [activeSessionId]);

  async function handleDiscardSession() {
    await discardSession();
    router.replace('/climb');
  }

  async function handleFinishSession(mode: EndSessionMode = 'default') {
    setFinishError(null);

    if ((mode === 'sent' || mode === 'anotherTime') && activeClimb && !canSaveActiveClimbResult) {
      setFinishError('Pick a main feature for the active climb before saving it as sent or for another time.');
      return;
    }

    if (mode === 'sent') {
      await finishActiveClimb(true);
    }

    if (mode === 'anotherTime') {
      await finishActiveClimb(false);
    }

    if (mode === 'discard') {
      await discardActiveClimb();
    }

    const endedSession = await endSession(sessionFinalizationDraft);

    if (endedSession) {
      router.replace({ pathname: '/session/summary', params: { sessionId: endedSession.id } });
    }
  }

  function handleSavePress() {
    setFinishError(null);

    if (activeClimb) {
      setFinishError('Choose how to save the active climb first.');
      return;
    }

    void handleFinishSession();
  }

  function returnToActiveSession() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/session/active');
  }

  if (!activeSession) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.title}>Finalise session</Text>
        <Text style={styles.subtitle}>{hasRestoreSettled ? 'No active session was found.' : 'Loading active session...'}</Text>
      </View>
    );
  }

  const entryTranslateX = entryProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width],
  });

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateX: entryTranslateX }] }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.76}
            accessibilityLabel="Return to active session"
            accessibilityRole="button"
            onPress={returnToActiveSession}
            style={styles.returnButton}
          >
            <Feather name="chevron-left" size={22} color={colors.charcoal} />
            <View>
              <Text style={styles.title}>Finalise session</Text>
            </View>
          </TouchableOpacity>
          <AppButton
            accessibilityLabel="Save session"
            disabled={isLoading}
            icon="flag"
            onPress={handleSavePress}
            style={[styles.saveButton, styles.saveActionButton]}
            title={isLoading ? 'Saving...' : 'Save'}
            variant="secondary"
          />
        </View>

        <SessionLiveStatsRow
          attempts={totals.attemptsLogged}
          climbs={totals.climbsLogged}
          elapsedSeconds={elapsedSeconds}
          timeValue={formatSessionDurationWords(elapsedSeconds)}
        />

        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Session details</Text>
          <Text style={styles.hint}>Leave the name blank to use {defaultSessionNamePreview}.</Text>
          <TextInput
            accessibilityLabel="Session name"
            onChangeText={(name) => setSessionFinalizationDraft((draft) => ({ ...draft, name }))}
            placeholder="Session name"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
            value={sessionFinalizationDraft.name}
          />
          <TextInput
            accessibilityLabel="Session description"
            multiline
            onChangeText={(description) => setSessionFinalizationDraft((draft) => ({ ...draft, description }))}
            placeholder="How did the session go? Add notes, beta, highlights, or anything worth remembering."
            placeholderTextColor={colors.muted}
            style={[styles.textInput, styles.descriptionInput]}
            textAlignVertical="top"
            value={sessionFinalizationDraft.description}
          />
        </AppCard>

        <AppCard style={styles.dateCard}>
          <View style={styles.dateItem}>
            <Text style={styles.statLabel}>Date</Text>
            <Text style={styles.statValue}>{formatSessionDate(activeSession.startTime)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.statLabel}>Started</Text>
            <Text style={styles.statValue}>{formatSessionTime(activeSession.startTime)}</Text>
          </View>
        </AppCard>

        {activeClimb ? (
          <AppCard style={styles.activeClimbCard}>
            <Text style={styles.cardTitle}>Active climb</Text>
            <Text style={styles.hint}>Choose how to save the climb you are currently logging before the session finishes.</Text>
            {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.actions}>
              <AppButton
                disabled={isLoading}
                icon="check-circle"
                onPress={() => void handleFinishSession('sent')}
                title={isLoading ? 'Saving...' : 'Sent It + Save'}
              />
              <AppButton
                disabled={isLoading}
                icon="x-circle"
                onPress={() => void handleFinishSession('anotherTime')}
                title="Another Time + Save"
                variant="secondary"
              />
              <AppButton
                disabled={isLoading}
                icon="trash-2"
                onPress={() => void handleFinishSession('discard')}
                title="Discard Climb + Save"
                variant="destructive"
              />
            </View>
          </AppCard>
        ) : (
          <View style={styles.actions}>
            {finishError ? <Text style={styles.errorText}>{finishError}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}

        <SessionDiscardSection disabled={isLoading} display="text" onDiscard={handleDiscardSession} style={styles.discardTextButton} />
    </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  activeClimbCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.charcoal,
    fontSize: 16,
    fontWeight: '800',
  },
  centerState: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  dateCard: {
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateItem: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 118,
    paddingTop: spacing.md,
  },
  errorText: {
    color: '#B85A3B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  formCard: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  returnButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  saveActionButton: {
    backgroundColor: colors.amber,
    borderColor: 'rgba(30,30,30,0.1)',
  },
  screen: {
    flex: 1,
  },
  discardTextButton: {
    alignSelf: 'center',
    marginTop: -spacing.md,
    paddingHorizontal: 0,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.charcoal,
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.charcoal,
    fontSize: 24,
    lineHeight: 29,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
