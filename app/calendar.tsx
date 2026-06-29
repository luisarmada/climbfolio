import { AppShell } from '../src/components/AppShell';
import { CalendarScreen } from '../src/screens/CalendarScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';

export default function CalendarRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<ProfileScreen />}>
      <CalendarScreen />
    </AppShell>
  );
}
