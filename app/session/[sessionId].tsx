import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { CalendarDaySessionsScreen } from '../../src/screens/CalendarDaySessionsScreen';
import { CalendarScreen } from '../../src/screens/CalendarScreen';
import { CollectionCellSessionsScreen } from '../../src/screens/CollectionCellSessionsScreen';
import { CollectionScreen } from '../../src/screens/CollectionScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SessionDetailScreen } from '../../src/screens/SessionDetailScreen';

function getSessionDetailUnderlay(returnTo: string | string[] | undefined) {
  const returnTarget = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  if (returnTarget === 'calendarDay') {
    return <CalendarDaySessionsScreen />;
  }

  if (returnTarget === 'calendar') {
    return <CalendarScreen />;
  }

  if (returnTarget === 'collectionCell') {
    return <CollectionCellSessionsScreen />;
  }

  if (returnTarget === 'collection') {
    return <CollectionScreen />;
  }

  return <ProfileScreen />;
}

export default function SessionDetailRoute() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  return (
    <AppShell transition="slideLeft" underlay={getSessionDetailUnderlay(returnTo)}>
      <SessionDetailScreen />
    </AppShell>
  );
}
