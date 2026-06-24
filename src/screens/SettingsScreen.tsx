import { Feather } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { colors, fonts, radius, spacing, typography } from '../design/tokens';

type SettingsRow = {
  detail: string;
  href?: Href;
  label: string;
  status?: string;
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
        detail: 'Display name, climber type, and profile badge',
        href: '/settings/profile',
        label: 'Profile',
        status: 'Ready',
      },
      { detail: 'Username, email, and password', label: 'Account' },
      { detail: 'Push, email, and activity alerts', label: 'Notifications' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      {
        detail: 'Grading scale and custom grade order',
        href: '/settings/climbing',
        label: 'Climbing preferences',
        status: 'Ready',
      },
      { detail: 'Profile visibility, followers, and sharing controls', label: 'Privacy and social' },
      { detail: 'Move session data in or out of Climb Book', label: 'Export / import data' },
    ],
  },
  {
    title: 'Help',
    rows: [
      { detail: 'Version, legal, and product information', label: 'About' },
      { detail: 'Questions, feedback, or support', label: 'Contact us' },
      { detail: 'Leave a rating when the app is published', label: 'Review on App Store' },
    ],
  },
];

export function SettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <TouchableOpacity activeOpacity={0.72} accessibilityLabel="Back to profile" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Profile</Text>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

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
                onPress={row.href ? () => router.push(row.href as Href) : undefined}
                style={[styles.row, index === section.rows.length - 1 && styles.lastRow]}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowDetail}>{row.detail}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{row.status ?? 'Coming soon'}</Text>
                </View>
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
    paddingBottom: 132,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
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
    ...typography.h2,
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
