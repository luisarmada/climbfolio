import { AppShell } from '../../src/components/AppShell';
import { ProfileSettingsScreen } from '../../src/screens/ProfileSettingsScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function ProfileSettingsRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<SettingsScreen />}>
      <ProfileSettingsScreen />
    </AppShell>
  );
}
