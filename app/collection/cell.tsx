import { AppShell } from '../../src/components/AppShell';
import { CollectionScreen } from '../../src/screens/CollectionScreen';
import { CollectionCellSessionsScreen } from '../../src/screens/CollectionCellSessionsScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';

export default function CollectionCellRoute() {
  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={<CollectionScreen />}>
      <CollectionCellSessionsScreen />
    </AppShell>
  );
}
