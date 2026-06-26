import { AppShell } from '../../src/components/AppShell';
import { SessionSummaryScreen } from '../../src/screens/SessionSummaryScreen';

export default function SessionSummaryRoute() {
  return (
    <AppShell showBottomNav={false}>
      <SessionSummaryScreen />
    </AppShell>
  );
}
