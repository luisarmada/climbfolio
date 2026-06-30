import { AppShell } from '../src/components/AppShell';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { SettingsScreen } from '../src/screens/SettingsScreen';

export default function SettingsRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<ProfileScreen />}>
      <SettingsScreen />
    </AppShell>
  );
}
