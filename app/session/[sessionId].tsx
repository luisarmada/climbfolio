import { AppShell } from '../../src/components/AppShell';
import { SessionDetailScreen } from '../../src/screens/SessionDetailScreen';

export default function SessionDetailRoute() {
  return (
    <AppShell showBottomNav={false}>
      <SessionDetailScreen />
    </AppShell>
  );
}
