import { AppShell } from '../src/components/AppShell';
import { HomeScreen } from '../src/screens/HomeScreen';
import { SearchScreen } from '../src/screens/SearchScreen';

export default function SearchRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<HomeScreen />}>
      <SearchScreen />
    </AppShell>
  );
}
