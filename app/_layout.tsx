import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppProviders } from '@/src/AppProviders';
import { t } from '@/src/i18n';
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
            background: '#E9E4DA',
            card: '#E9E4DA',
          },
        };

  return (
    <ThemeProvider value={theme}>
      <AppProviders>
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.colors.background } }}>
          <Stack.Screen name="index" options={{ title: t('nav.home') }} />
          <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
          <Stack.Screen name="list" options={{ title: t('nav.list') }} />
          <Stack.Screen name="map" options={{ title: t('nav.map') }} />
          <Stack.Screen name="collection" options={{ headerShown: false }} />
          <Stack.Screen name="collection/pref/[id]" options={{ title: t('nav.collectionPref') }} />
          <Stack.Screen name="chubu" options={{ title: t('nav.chubu') }} />
          <Stack.Screen name="hokkaido" options={{ title: t('nav.hokkaido') }} />
          <Stack.Screen name="kanto" options={{ title: t('nav.kanto') }} />
          <Stack.Screen name="tohoku" options={{ title: t('nav.tohoku') }} />
          <Stack.Screen name="chugoku" options={{ title: t('nav.chugoku') }} />
          <Stack.Screen name="kansai" options={{ title: t('nav.kansai') }} />
          <Stack.Screen name="kyushu" options={{ title: t('nav.kyushu') }} />
          <Stack.Screen name="shikoku" options={{ title: t('nav.shikoku') }} />
          <Stack.Screen name="everyone" options={{ title: t('nav.everyone') }} />
          <Stack.Screen name="shared" options={{ title: t('nav.shared') }} />
          <Stack.Screen name="shared/[id]" options={{ title: t('nav.shared') }} />
          <Stack.Screen name="reminders" options={{ title: t('nav.reminders') }} />
          <Stack.Screen name="store/new" options={{ title: t('nav.storeNew') }} />
          <Stack.Screen name="store/[id]" options={{ title: t('nav.storeDetail') }} />
          <Stack.Screen name="travel/new" options={{ title: t('nav.travelNew') }} />
          <Stack.Screen name="travel/pref-list" options={{ headerShown: false }} />
          <Stack.Screen name="travel/pref/[prefCode]" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ title: t('nav.onboarding') }} />
          <Stack.Screen name="post-limit-info" options={{ title: t('nav.postLimitInfo') }} />
        </Stack>
      </AppProviders>
    </ThemeProvider>
  );
}
