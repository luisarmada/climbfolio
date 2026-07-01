import { Feather } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { useProfileReturnTransition } from '../components/AppShell';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';
import { useRememberedScrollView } from '../hooks/useRememberedScrollView';

type SettingsRow = {
  detail: string;
  href?: Href;
  label: string;
};

type SettingsSection = {
  rows: SettingsRow[];
  title: string;
};

const settingsSections: SettingsSection[] = [
  {
    title: 'Account',
    rows: [
      {
        detail: 'Display name and tagline',
        href: '/settings/profile',
        label: 'Profile',
      },
      { detail: 'Username, email, and password', label: 'Account' },
      { detail: 'Push, email, and activity alerts', label: 'Notifications' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      {
        detail: 'Built-in, custom, and tape grading systems',
        href: '/settings/climbing',
        label: 'Grade scales',
      },
      {
        detail: 'Places, location type, and grade scale mapping',
        href: '/settings/locations',
        label: 'Locations',
      },
      { detail: 'Profile visibility, followers, and sharing controls', label: 'Privacy and social' },
    ],
  },
  {
    title: 'Help',
    rows: [
      { detail: 'Questions, feedback, or support', label: 'Contact us' },
      { detail: 'Leave a rating when the app is published', label: 'Review on App Store' },
    ],
  },
];

export function SettingsScreen() {
  const router = useRouter();
  const { returnToProfile } = useProfileReturnTransition();
  const scrollViewRef = useRef<ScrollView>(null);
  const rememberedScroll = useRememberedScrollView('/settings', scrollViewRef);

  return (
    <ScrollView
      nativeID={rememberedScroll.nativeID}
      ref={scrollViewRef}
      contentContainerStyle={styles.content}
      contentOffset={rememberedScroll.initialContentOffset}
      onContentSizeChange={rememberedScroll.handleContentSizeChange}
      onScroll={rememberedScroll.handleScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <TouchableOpacity activeOpacity={0.72} accessibilityLabel="Back to profile" accessibilityRole="button" onPress={returnToProfile} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.78}
        accessibilityLabel="Manage subscription"
        accessibilityRole="button"
        onPress={() => {
          rememberedScroll.rememberCurrentScrollOffset();
          router.push('/settings/subscription');
        }}
        style={styles.subscriptionCard}
      >
        <View style={styles.subscriptionIcon}>
          <Feather name="star" size={22} color={colors.charcoal} />
        </View>
        <View style={styles.subscriptionCopy}>
          <Text style={styles.subscriptionEyebrow}>Free plan</Text>
          <Text style={styles.subscriptionTitle}>Manage Subscription</Text>
          <Text style={styles.subscriptionDetail}>Preview Premium features and plan status</Text>
        </View>
        <Feather name="chevron-right" size={22} color={colors.charcoal} />
      </TouchableOpacity>

      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <AppCard style={styles.sectionCard}>
            {section.rows.map((row, index) => (
              <TouchableOpacity
                activeOpacity={0.72}
                accessibilityLabel={`${row.label}: ${row.detail}`}
                accessibilityRole="button"
                key={row.label}
                onPress={row.href ? () => {
                  rememberedScroll.rememberCurrentScrollOffset();
                  router.push(row.href as Href);
                } : undefined}
                style={[styles.row, index === section.rows.length - 1 && styles.lastRow]}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowDetail}>{row.detail}</Text>
                </View>
                {row.href ? null : (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>Coming soon</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </AppCard>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    paddingBottom: 240,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  subscriptionCard: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderColor: 'rgba(30,30,30,0.12)',
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  subscriptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  subscriptionDetail: {
    color: 'rgba(30,30,30,0.68)',
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  subscriptionEyebrow: {
    color: 'rgba(30,30,30,0.72)',
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  subscriptionIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  subscriptionTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: 2,
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.stone,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
  },
  rowCopy: {
    flex: 1,
  },
  rowDetail: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  rowLabel: {
    color: colors.charcoal,
    fontFamily: fonts.bold,
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionCard: {
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  statusPill: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  statusText: {
    color: colors.muted,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  titleBlock: {
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
