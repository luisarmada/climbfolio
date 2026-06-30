import { AppShell } from '../../src/components/AppShell';
import { LocationSettingsScreen } from '../../src/screens/LocationSettingsScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function LocationSettingsRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<SettingsScreen />}>
      <LocationSettingsScreen />
    </AppShell>
  );
}
