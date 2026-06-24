import { AppShell } from '../src/components/AppShell';
import { SettingsScreen } from '../src/screens/SettingsScreen';

export default function SettingsRoute() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  );
}
