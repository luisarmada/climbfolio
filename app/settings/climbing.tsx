import { AppShell } from '../../src/components/AppShell';
import { ClimbingPreferencesScreen } from '../../src/screens/ClimbingPreferencesScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function ClimbingPreferencesRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<SettingsScreen />}>
      <ClimbingPreferencesScreen />
    </AppShell>
  );
}
