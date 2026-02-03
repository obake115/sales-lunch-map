import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/src/AppProviders';
import { ThemeProvider as ThemeModeProvider, useThemeMode } from '@/src/state/ThemeContext';

// Register background geofencing task (side-effect import).
import '@/src/tasks/geofenceTask';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeModeProvider>
      <RootLayoutNav />
    </ThemeModeProvider>
  );
}

function RootLayoutNav() {
  const { themeMode } = useThemeMode();
  const theme =
    themeMode === 'navy'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: '#0F172A',
            card: '#0F172A',
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: '#FFF4D6',
            card: '#FFF4D6',
          },
        };

  return (
    <ThemeProvider value={theme}>
      <AppProviders>
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.colors.background } }}>
          <Stack.Screen name="index" options={{ title: 'ホーム' }} />
          <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
          <Stack.Screen name="map" options={{ title: 'マップ' }} />
          <Stack.Screen name="shared" options={{ title: '共同マップ' }} />
          <Stack.Screen name="shared/[id]" options={{ title: '共同マップ' }} />
          <Stack.Screen name="reminders" options={{ title: 'リマインド一覧' }} />
          <Stack.Screen name="store/new" options={{ title: '候補を登録' }} />
          <Stack.Screen name="store/[id]" options={{ title: 'ランチ候補' }} />
        </Stack>
      </AppProviders>
    </ThemeProvider>
  );
}
