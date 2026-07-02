import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { CalendarDaySessionsScreen } from '../../src/screens/CalendarDaySessionsScreen';
import { CalendarScreen } from '../../src/screens/CalendarScreen';
import { CollectionCellSessionsScreen } from '../../src/screens/CollectionCellSessionsScreen';
import { CollectionScreen } from '../../src/screens/CollectionScreen';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { SessionDetailScreen } from '../../src/screens/SessionDetailScreen';

function getSessionDetailUnderlay(returnTo: string | string[] | undefined, homeScrollOffset: string | string[] | undefined) {
  const returnTarget = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const rawHomeScrollOffset = Array.isArray(homeScrollOffset) ? homeScrollOffset[0] : homeScrollOffset;
  const initialHomeScrollOffset = Number(rawHomeScrollOffset ?? 0);

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

  if (returnTarget === 'home') {
    return <HomeScreen initialScrollOffset={Number.isFinite(initialHomeScrollOffset) ? initialHomeScrollOffset : 0} />;
  }

  return <ProfileScreen />;
}

export default function SessionDetailRoute() {
  const { homeScrollOffset, returnTo } = useLocalSearchParams<{ homeScrollOffset?: string; returnTo?: string }>();

  return (
    <AppShell returnToProfileUnderlay={<ProfileScreen />} transition="slideLeft" underlay={getSessionDetailUnderlay(returnTo, homeScrollOffset)}>
      <SessionDetailScreen />
    </AppShell>
  );
}
