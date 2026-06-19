import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppCard } from '../components/AppCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing, typography } from '../design/tokens';

const preferenceRows = [
  { icon: 'bar-chart-2', title: 'Grade System', value: 'V Scale', accent: colors.mint },
  { icon: 'grid', title: 'Default Activity View', value: 'General', accent: colors.amber },
  { icon: 'bell', title: 'Notifications', value: 'On', accent: colors.lavender },
  { icon: 'cloud', title: 'Data Storage', value: 'Local only', accent: colors.coral },
] as const;

export function ProfileScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your climbing identity</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.iconButton} accessibilityRole="button">
          <Feather name="settings" size={23} color={colors.charcoal} />
        </TouchableOpacity>
      </View>

      <AppCard style={styles.profileCard}>
        <View style={styles.avatar}>
          <View style={styles.avatarBody} />
          <View style={styles.avatarHead} />
          <View style={[styles.avatarHold, styles.avatarHoldOne]} />
          <View style={[styles.avatarHold, styles.avatarHoldTwo]} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>Alex Carter</Text>
          <Text style={styles.profileType}>Indoor boulderer</Text>
          <Text style={styles.bestBadge}>Best Grade V5</Text>
        </View>
        <View style={styles.editCircle}>
          <Feather name="edit-3" size={18} color={colors.charcoal} />
        </View>
      </AppCard>

      <SectionHeader title="Lifetime Stats" />
      <View style={styles.compactGrid}>
        <StatCard compact icon="triangle" accent="mint" value="48" label="Sessions" style={styles.compactStat} />
        <StatCard compact icon="link" accent="amber" value="315" label="Climbs" style={styles.compactStat} />
        <StatCard compact icon="zap" accent="lavender" value="21" label="Day Streak" style={styles.compactStat} />
      </View>

      <SectionHeader title="Goals" />
      <AppCard style={styles.goalCard}>
        <View style={[styles.goalIcon, { backgroundColor: colors.lavender }]}>
          <Feather name="target" size={26} color={colors.charcoal} />
        </View>
        <View style={styles.goalMain}>
          <Text style={styles.goalTitle}>Climb 20 times this month</Text>
          <View style={styles.goalTrack}>
            <View style={styles.goalFill} />
          </View>
        </View>
        <View style={styles.goalMeta}>
          <Text style={styles.goalCount}>12 / 20</Text>
          <Text style={styles.goalPercent}>60%</Text>
        </View>
      </AppCard>

      <SectionHeader title="Preferences" />
      <AppCard style={styles.preferences}>
        {preferenceRows.map((row, index) => (
          <View key={row.title} style={[styles.prefRow, index === preferenceRows.length - 1 && styles.prefRowLast]}>
            <View style={[styles.prefIcon, { backgroundColor: row.accent }]}>
              <Feather name={row.icon} size={18} color={colors.charcoal} />
            </View>
            <Text style={styles.prefTitle}>{row.title}</Text>
            <Text style={styles.prefValue}>{row.value}</Text>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </View>
        ))}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    color: colors.charcoal,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.35,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 174,
    padding: spacing.lg,
  },
  avatar: {
    backgroundColor: '#E6DDD0',
    borderRadius: radius.pill,
    height: 116,
    overflow: 'hidden',
    position: 'relative',
    width: 116,
  },
  avatarBody: {
    backgroundColor: '#5DB194',
    borderRadius: 24,
    height: 76,
    left: 47,
    position: 'absolute',
    top: 31,
    transform: [{ rotate: '18deg' }],
    width: 42,
  },
  avatarHead: {
    backgroundColor: '#232323',
    borderRadius: radius.pill,
    height: 25,
    left: 50,
    position: 'absolute',
    top: 18,
    width: 25,
  },
  avatarHold: {
    backgroundColor: '#F07C43',
    borderRadius: radius.pill,
    height: 18,
    position: 'absolute',
    width: 24,
  },
  avatarHoldOne: {
    right: 21,
    top: 23,
    transform: [{ rotate: '-20deg' }],
  },
  avatarHoldTwo: {
    backgroundColor: colors.lavender,
    bottom: 43,
    right: 29,
    transform: [{ rotate: '20deg' }],
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: colors.charcoal,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.3,
    lineHeight: 32,
  },
  profileType: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.md,
    marginTop: 4,
  },
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,222,212,0.55)',
    borderRadius: radius.pill,
    color: '#494039',
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  editCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(250,247,241,0.8)',
    borderColor: colors.stone,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  compactGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compactStat: {
    flex: 1,
  },
  goalCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  goalIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  goalMain: {
    flex: 1,
  },
  goalTitle: {
    color: colors.charcoal,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  goalTrack: {
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    height: 9,
    overflow: 'hidden',
  },
  goalFill: {
    backgroundColor: colors.lavender,
    borderRadius: radius.pill,
    height: '100%',
    width: '60%',
  },
  goalMeta: {
    alignItems: 'flex-end',
    minWidth: 58,
  },
  goalCount: {
    color: colors.charcoal,
    fontSize: 18,
    fontWeight: '800',
  },
  goalPercent: {
    color: '#8F6ED5',
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  preferences: {
    paddingHorizontal: spacing.lg,
  },
  prefRow: {
    alignItems: 'center',
    borderBottomColor: colors.stone,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    gap: spacing.md,
  },
  prefRowLast: {
    borderBottomWidth: 0,
  },
  prefIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  prefTitle: {
    color: colors.charcoal,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  prefValue: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
