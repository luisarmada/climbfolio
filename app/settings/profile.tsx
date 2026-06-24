import { AppShell } from '../../src/components/AppShell';
import { ProfileSettingsScreen } from '../../src/screens/ProfileSettingsScreen';

export default function ProfileSettingsRoute() {
  return (
    <AppShell>
      <ProfileSettingsScreen />
    </AppShell>
  );
}
