import { AppShell } from '../src/components/AppShell';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { StatisticsScreen } from '../src/screens/StatisticsScreen';

export default function StatisticsRoute() {
  return (
    <AppShell transition="slideLeft" underlay={<ProfileScreen />}>
      <StatisticsScreen />
    </AppShell>
  );
}
