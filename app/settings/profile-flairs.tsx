import { AppShell } from '../../src/components/AppShell';
import { ProfileFlairPickerScreen } from '../../src/screens/ProfileFlairPickerScreen';
import { ProfileSettingsScreen } from '../../src/screens/ProfileSettingsScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';

export default function ProfileFlairsRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<ProfileSettingsScreen />}>
      <ProfileFlairPickerScreen />
    </AppShell>
  );
}
