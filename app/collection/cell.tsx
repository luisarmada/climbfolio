import { AppShell } from '../../src/components/AppShell';
import { CollectionScreen } from '../../src/screens/CollectionScreen';
import { CollectionCellSessionsScreen } from '../../src/screens/CollectionCellSessionsScreen';

export default function CollectionCellRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<CollectionScreen />}>
      <CollectionCellSessionsScreen />
    </AppShell>
  );
}
