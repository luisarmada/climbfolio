import { AppShell } from '../../src/components/AppShell';
import { StartClimbScreen } from '../../src/screens/StartClimbScreen';

export default function StartClimbRoute() {
  return (
    <AppShell showBottomNav={false}>
      <StartClimbScreen />
    </AppShell>
  );
}
