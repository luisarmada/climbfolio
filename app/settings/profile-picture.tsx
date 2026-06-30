import { AppShell } from '../../src/components/AppShell';
import { ProfilePicturePickerScreen } from '../../src/screens/ProfilePicturePickerScreen';
import { ProfileSettingsScreen } from '../../src/screens/ProfileSettingsScreen';

export default function ProfilePictureRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<ProfileSettingsScreen />}>
      <ProfilePicturePickerScreen />
    </AppShell>
  );
}
