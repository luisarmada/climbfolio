import { AppShell } from '../../src/components/AppShell';
import { LocationSettingsScreen } from '../../src/screens/LocationSettingsScreen';

export default function LocationSettingsRoute() {
  return (
    <AppShell>
      <LocationSettingsScreen />
    </AppShell>
  );
}
