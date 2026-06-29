import { AppShell } from '../../src/components/AppShell';
import { ProfileSettingsScreen } from '../../src/screens/ProfileSettingsScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function ProfileSettingsRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<SettingsScreen />}>
      <ProfileSettingsScreen />
    </AppShell>
  );
}
