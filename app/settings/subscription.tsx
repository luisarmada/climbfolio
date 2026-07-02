import { AppShell } from '../../src/components/AppShell';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { SubscriptionScreen } from '../../src/screens/SubscriptionScreen';

export default function SubscriptionRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<SettingsScreen />}>
      <SubscriptionScreen />
    </AppShell>
  );
}
