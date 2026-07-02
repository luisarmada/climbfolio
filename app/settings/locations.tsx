import { AppShell } from '../../src/components/AppShell';
import { LocationSettingsScreen } from '../../src/screens/LocationSettingsScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function LocationSettingsRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<SettingsScreen />}>
      <LocationSettingsScreen />
    </AppShell>
  );
}
