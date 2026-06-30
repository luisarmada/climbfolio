import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { colors, fonts } from '../src/design/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

declare const require: (path: string) => number;

const manropeFonts = {
  Manrope_400Regular: require('../assets/fonts/Manrope_400Regular.ttf'),
  Manrope_500Medium: require('../assets/fonts/Manrope_500Medium.ttf'),
  Manrope_600SemiBold: require('../assets/fonts/Manrope_600SemiBold.ttf'),
  Manrope_700Bold: require('../assets/fonts/Manrope_700Bold.ttf'),
  Manrope_800ExtraBold: require('../assets/fonts/Manrope_800ExtraBold.ttf'),
};

let defaultFontApplied = false;

function applyDefaultFont() {
  if (defaultFontApplied) {
    return;
  }

  const defaultText = Text as typeof Text & { defaultProps?: { style?: unknown } };
  const defaultTextInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

  defaultText.defaultProps = defaultText.defaultProps ?? {};
  defaultText.defaultProps.style = [defaultText.defaultProps.style, { fontFamily: fonts.regular }];

  defaultTextInput.defaultProps = defaultTextInput.defaultProps ?? {};
  defaultTextInput.defaultProps.style = [defaultTextInput.defaultProps.style, { fontFamily: fonts.regular }];

  defaultFontApplied = true;
}

applyDefaultFont();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(manropeFonts);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          animation: 'none',
          contentStyle: { backgroundColor: colors.chalk },
          headerShown: false,
        }}
      >
        <Stack.Screen name="session/active" options={{ animation: 'none' }} />
        <Stack.Screen name="session/finish" options={{ animation: 'none' }} />
        <Stack.Screen name="session/summary" options={{ animation: 'none' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    backgroundColor: colors.chalk,
    flex: 1,
  },
});
