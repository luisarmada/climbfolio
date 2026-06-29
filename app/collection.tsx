import { AppShell } from '../src/components/AppShell';
import { CollectionScreen } from '../src/screens/CollectionScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';

export default function CollectionRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<ProfileScreen />}>
      <CollectionScreen />
    </AppShell>
  );
}
