import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from './BottomNav';
import { colors } from '../design/tokens';

type AppShellProps = PropsWithChildren<{
  showBottomNav?: boolean;
}>;

export function AppShell({ children, showBottomNav = true }: AppShellProps) {
  const edges: Edge[] = showBottomNav ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right'];

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={styles.container}>
        {children}
        {showBottomNav ? <BottomNav /> : null}
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
