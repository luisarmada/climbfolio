import { AppShell } from '../src/components/AppShell';
import { useLocalSearchParams } from 'expo-router';
import { HomeScreen } from '../src/screens/HomeScreen';
import { SearchScreen } from '../src/screens/SearchScreen';

export default function SearchRoute() {
  const { homeScrollOffset } = useLocalSearchParams<{ homeScrollOffset?: string }>();
  const initialHomeScrollOffset = Number(homeScrollOffset ?? 0);

  return (
    <AppShell transition="slideLeft" underlay={<HomeScreen initialScrollOffset={Number.isFinite(initialHomeScrollOffset) ? initialHomeScrollOffset : 0} />}>
      <SearchScreen />
    </AppShell>
  );
}
