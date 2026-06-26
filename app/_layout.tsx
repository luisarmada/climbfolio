import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { colors, fonts } from '../src/design/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function applyDefaultFont() {
  const defaultText = Text as typeof Text & { defaultProps?: { style?: unknown } };
  const defaultTextInput = TextInput as typeof TextInput & { defaultProps?: { style?: unknown } };

  defaultText.defaultProps = defaultText.defaultProps ?? {};
  defaultText.defaultProps.style = [defaultText.defaultProps.style, { fontFamily: fonts.regular }];

  defaultTextInput.defaultProps = defaultTextInput.defaultProps ?? {};
  defaultTextInput.defaultProps.style = [defaultTextInput.defaultProps.style, { fontFamily: fonts.regular }];
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyDefaultFont();
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
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
