import { AppShell } from '../../src/components/AppShell';
import { SessionFinishScreen } from '../../src/screens/SessionFinishScreen';

export default function SessionFinishRoute() {
  return (
    <AppShell showBottomNav={false}>
      <SessionFinishScreen />
    </AppShell>
  );
}
