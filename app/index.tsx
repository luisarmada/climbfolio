import { AppShell } from '../src/components/AppShell';
import { HomeScreen } from '../src/screens/HomeScreen';

export default function HomeRoute() {
  return (
    <AppShell>
      <HomeScreen />
    </AppShell>
  );
}
