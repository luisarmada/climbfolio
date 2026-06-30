import { AppShell } from '../../src/components/AppShell';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { SubscriptionScreen } from '../../src/screens/SubscriptionScreen';

export default function SubscriptionRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<SettingsScreen />}>
      <SubscriptionScreen />
    </AppShell>
  );
}
