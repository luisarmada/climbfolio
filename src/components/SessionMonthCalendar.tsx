import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from './AppCard';
import { colors, fonts, radius, spacing } from '../design/tokens';
import { formatMonthLabel, getLocalDayKey } from '../features/summaries';

type CalendarDay = {
  date: Date;
  inMonth: boolean;
  key: string;
};

type SessionMonthCalendarProps = {
  activeDayKey?: string;
  month?: Date;
  sessionDayKeys: Set<string>;
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthDays(date: Date): CalendarDay[] {
  const monthStart = startOfMonth(date);
  const firstDay = monthStart.getDay();
  const leadingDays = firstDay === 0 ? 6 : firstDay - 1;
  const gridStart = new Date(monthStart);

  gridStart.setDate(monthStart.getDate() - leadingDays);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);

    return {
      date: day,
      inMonth: day.getMonth() === date.getMonth(),
      key: getLocalDayKey(day),
    };
  });
}

export function SessionMonthCalendar({ activeDayKey, month = new Date(), sessionDayKeys }: SessionMonthCalendarProps) {
  const monthDays = buildMonthDays(month);
  const todayKey = getLocalDayKey(new Date());

  return (
    <AppCard style={styles.card}>
      <Text style={styles.monthTitle}>{formatMonthLabel(month)}</Text>

      <View style={styles.weekHeader}>
        {weekDays.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {monthDays.map((day) => {
          const hasSession = day.inMonth && sessionDayKeys.has(day.key);
          const isActiveSessionDay = day.inMonth && day.key === activeDayKey;
          const isToday = day.key === todayKey;

          return (
            <View
              key={`${formatMonthLabel(month)}-${day.key}`}
              style={[
                styles.dayCell,
                !day.inMonth && styles.outsideMonthDay,
                isToday && styles.todayCell,
                hasSession && styles.sessionDay,
                isActiveSessionDay && styles.activeSessionDay,
              ]}
            >
              <Text style={[styles.dayText, !day.inMonth && styles.outsideMonthText]}>{day.date.getDate()}</Text>
              {hasSession || isActiveSessionDay ? <View style={styles.sessionDot} /> : null}
            </View>
          );
        })}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  activeSessionDay: {
    backgroundColor: 'rgba(255,209,102,0.48)',
    borderColor: colors.amber,
    borderWidth: 2,
  },
  card: {
    padding: spacing.lg,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.stone,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
    width: '13.2%',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayText: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 13,
    fontWeight: '800',
  },
  monthTitle: {
    color: colors.charcoal,
    fontFamily: fonts.extraBold,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: spacing.lg,
  },
  outsideMonthDay: {
    backgroundColor: 'rgba(251,247,239,0.46)',
  },
  outsideMonthText: {
    color: colors.muted,
  },
  sessionDay: {
    backgroundColor: 'rgba(168,221,191,0.62)',
    borderColor: colors.success,
    borderWidth: 2,
  },
  sessionDot: {
    backgroundColor: colors.charcoal,
    borderRadius: radius.pill,
    bottom: 5,
    height: 4,
    position: 'absolute',
    width: 4,
  },
  todayCell: {
    borderColor: colors.amber,
  },
  weekDay: {
    color: colors.muted,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
});
