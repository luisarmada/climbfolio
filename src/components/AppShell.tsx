import { PropsWithChildren, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { ActiveSessionBanner } from './ActiveSessionBanner';
import { BottomNav } from './BottomNav';
import { colors } from '../design/tokens';
import { useActiveSessionStore } from '../features/sessions';

type AppShellProps = PropsWithChildren<{
  showBottomNav?: boolean;
}>;

let hasRequestedActiveSessionRestore = false;

export function AppShell({ children, showBottomNav = true }: AppShellProps) {
  const edges: Edge[] = showBottomNav ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right'];
  const restoreActiveSession = useActiveSessionStore((state) => state.restoreActiveSession);

  useEffect(() => {
    if (hasRequestedActiveSessionRestore) {
      return;
    }

    hasRequestedActiveSessionRestore = true;
    void restoreActiveSession();
  }, [restoreActiveSession]);

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.container}>
        {children}
        {showBottomNav ? (
          <>
            <ActiveSessionBanner />
            <BottomNav />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.chalk,
    flex: 1,
  },
  container: {
    backgroundColor: colors.chalk,
    flex: 1,
  },
});
