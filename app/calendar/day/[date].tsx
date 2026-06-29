import { AppShell } from '../../../src/components/AppShell';
import { CalendarScreen } from '../../../src/screens/CalendarScreen';
import { CalendarDaySessionsScreen } from '../../../src/screens/CalendarDaySessionsScreen';

export default function CalendarDayRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<CalendarScreen />}>
      <CalendarDaySessionsScreen />
    </AppShell>
  );
}
