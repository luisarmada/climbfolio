import { AppShell } from '../../src/components/AppShell';
import { ClimbingPreferencesScreen } from '../../src/screens/ClimbingPreferencesScreen';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

export default function ClimbingPreferencesRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<SettingsScreen />}>
      <ClimbingPreferencesScreen />
    </AppShell>
  );
}
