import { AppShell } from '../../src/components/AppShell';
import { ActiveSessionScreen } from '../../src/screens/ActiveSessionScreen';
import { SessionFinishScreen } from '../../src/screens/SessionFinishScreen';

export default function SessionFinishRoute() {
  return (
    <AppShell showBottomNav={false} transition="slideLeft" underlay={<ActiveSessionScreen disableEntryAnimation />}>
      <SessionFinishScreen />
    </AppShell>
  );
}
