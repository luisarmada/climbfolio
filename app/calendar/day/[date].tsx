import { AppShell } from '../../../src/components/AppShell';
import { CalendarScreen } from '../../../src/screens/CalendarScreen';
import { CalendarDaySessionsScreen } from '../../../src/screens/CalendarDaySessionsScreen';
import { ProfileScreen } from '../../../src/screens/ProfileScreen';

export default function CalendarDayRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<CalendarScreen />}>
      <CalendarDaySessionsScreen />
    </AppShell>
  );
}
