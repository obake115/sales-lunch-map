import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';

import { logScreenView } from '@/src/analytics';
import { AppProviders } from '@/src/AppProviders';
import { t } from '@/src/i18n';
import { fonts } from '@/src/ui/fonts';
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
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
    MPLUSRounded1c_800ExtraBold,
    ...FontAwesome.font,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loaded || error) {
      setReady(true);
    }
  }, [loaded, error]);

  // Fallback: proceed after 1s even if useFonts never resolves (e.g. Expo reload)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeModeProvider>
      <RootLayoutNav />
    </ThemeModeProvider>
  );
}

const SCREEN_NAMES: Record<string, string> = {
  '/': 'Home',
  '/profile': 'Profile',
  '/list': 'StoreList',
  '/map': 'Map',
  '/collection': 'Collection',
  '/everyone': 'Everyone',
  '/shared': 'SharedMaps',
  '/reminders': 'Reminders',
  '/store/new': 'StoreNew',
  '/travel/new': 'TravelNew',
  '/travel/pref-list': 'TravelPrefList',
  '/welcome': 'Welcome',
  '/settings': 'Settings',
  '/guide': 'Guide',
  '/stats': 'Stats',
  '/data-migration': 'DataMigration',
  '/onboarding': 'Onboarding',
  '/post-limit-info': 'PostLimitInfo',
  '/hokkaido': 'Hokkaido',
  '/tohoku': 'Tohoku',
  '/kanto': 'Kanto',
  '/chubu': 'Chubu',
  '/kansai': 'Kansai',
  '/chugoku': 'Chugoku',
  '/shikoku': 'Shikoku',
  '/kyushu': 'Kyushu',
};

function toScreenName(pathname: string): string {
  if (SCREEN_NAMES[pathname]) return SCREEN_NAMES[pathname];
  if (pathname.startsWith('/store/')) return 'StoreDetail';
  if (pathname.startsWith('/shared/')) return 'SharedMapDetail';
  if (pathname.startsWith('/collection/pref/')) return 'CollectionPref';
  if (pathname.startsWith('/travel/pref/')) return 'TravelPref';
  return pathname;
}

function RootLayoutNav() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      logScreenView(toScreenName(pathname));
    }
  }, [pathname]);

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
        <Stack screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerTitleStyle: { fontFamily: fonts.bold },
          headerBackButtonDisplayMode: 'minimal',
        }}>
          <Stack.Screen name="index" options={{ title: t('nav.home') }} />
          <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
          <Stack.Screen name="list" options={{ title: t('nav.list') }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
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
          <Stack.Screen name="everyone" options={{ headerShown: false }} />
          <Stack.Screen name="shared" options={{ title: t('nav.shared') }} />
          <Stack.Screen name="shared/[id]" options={{ title: t('nav.shared') }} />
          <Stack.Screen name="reminders" options={{ title: t('nav.reminders') }} />
          <Stack.Screen name="store/new" options={{ title: t('nav.storeNew') }} />
          <Stack.Screen name="store/[id]" options={{ title: t('nav.storeDetail') }} />
          <Stack.Screen name="travel/new" options={{ title: t('nav.travelNew') }} />
          <Stack.Screen name="travel/pref-list" options={{ headerShown: false }} />
          <Stack.Screen name="travel/pref/[prefCode]" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
          <Stack.Screen name="data-migration" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ title: t('nav.onboarding') }} />
          <Stack.Screen name="guide" options={{ title: t('nav.guide') }} />
          <Stack.Screen name="stats" options={{ title: t('nav.stats') }} />
          <Stack.Screen name="post-limit-info" options={{ title: t('nav.postLimitInfo') }} />
          <Stack.Screen name="privacy" options={{ title: t('nav.privacy') }} />
          <Stack.Screen name="terms" options={{ title: t('nav.terms') }} />
        </Stack>
      </AppProviders>
    </ThemeProvider>
  );
}
