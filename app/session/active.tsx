import { AppShell } from '../../src/components/AppShell';
import { ActiveSessionScreen } from '../../src/screens/ActiveSessionScreen';

export default function ActiveSessionRoute() {
  return (
    <AppShell showBottomNav={false}>
      <ActiveSessionScreen />
    </AppShell>
  );
}
