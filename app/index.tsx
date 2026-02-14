import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Image, Pressable, Text, View, useWindowDimensions, type ImageStyle } from 'react-native';

import { TravelLunchCard } from '@/components/TravelLunchCard';
import { t } from '@/src/i18n';
import { getHasSeenOnboarding, getProfileAvatarUri, getTravelLunchProgress } from '@/src/storage';
import { useThemeMode } from '@/src/state/ThemeContext';
import { InlineAdBanner } from '@/src/ui/AdBanner';
import { PermissionNotice } from '@/src/ui/PermissionNotice';

const QUICK_PADDING_H = 32;
const QUICK_GAP = 8;
const QUICK_ICON_SIZE = 76;

const UI = {
  card: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 10,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  input: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  } as const,
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  } as const,
  buttonText: {
    fontWeight: '500',
  } as const,
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  } as const,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as const,
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  } as const,
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  } as const,
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  profileImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  } as const,
  quickContainer: {
    marginTop: 12,
  } as const,
  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  } as const,
  quickItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  } as const,
  quickLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  } as const,
  quickImage: {
    width: QUICK_ICON_SIZE,
    height: QUICK_ICON_SIZE,
  } as const,
  storeImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  } as const,
  storeImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  storeImageText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 12,
  } as const,
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  } as const,
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  } as const,
  tagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  } as const,
  listBtn: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    alignItems: 'center',
  } as const,
  listBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  } as const,
  titleText: {
    fontWeight: '600',
  } as const,
  bodyText: {
    fontWeight: '400',
  } as const,
} as const;

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function StoreListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [travelProgress, setTravelProgress] = useState(0);
  const { themeMode } = useThemeMode();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const quickItemWidth = useMemo(
    () => (width - QUICK_PADDING_H * 2 - QUICK_GAP * 3) / 4,
    [width]
  );
  const quickItems = useMemo(
    () => [
      { key: 'map', label: 'マップ', source: require('@/assets/images/quick-map.png'), onPress: () => router.push('/map') },
      {
        key: 'collab',
        label: '共同編集',
        source: require('@/assets/images/quick-shared.png'),
        onPress: () => router.push('/shared'),
      },
      {
        key: 'all',
        label: 'みんなで',
        source: require('@/assets/images/quick-everyone.jpg'),
        onPress: () => router.push('/everyone'),
      },
      {
        key: 'album',
        label: 'アルバム',
        source: require('@/assets/images/quick-album.png'),
        onPress: () => router.push('/reminders'),
      },
    ],
    [router]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const uri = await getProfileAvatarUri();
      if (mounted) setAvatarUri(uri);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const seen = await getHasSeenOnboarding();
        if (!mounted) return;
        if (!seen) {
          router.replace('/onboarding');
          return;
        }
        setCheckingOnboarding(false);
      } catch {
        if (mounted) setCheckingOnboarding(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const [uri, progress] = await Promise.all([getProfileAvatarUri(), getTravelLunchProgress()]);
        if (mounted) {
          setAvatarUri(uri);
          setTravelProgress(progress);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  if (checkingOnboarding) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <PermissionNotice />

        <View style={UI.headerRow}>
          <Text style={[UI.headerTitle, themeMode === 'navy' ? { color: '#FFFFFF' } : null]}>
            {t('home.title')}
          </Text>
          <View style={UI.headerActions}>
            <Pressable
              onPress={() => Alert.alert(t('home.noticeTitle'), t('home.noticeBody'))}
              style={UI.iconBtn}>
              <FontAwesome name="bell-o" size={18} color="#F59E0B" />
            </Pressable>
            <Pressable
              onPress={() => Alert.alert(t('home.settingsTitle'), t('home.settingsBody'))}
              style={UI.iconBtn}>
              <FontAwesome name="cog" size={18} color="#6B7280" />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')} style={UI.profileBtn}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={UI.profileImage} />
              ) : (
                <Text style={[UI.buttonText, { color: '#111827' }]}>👤</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={[UI.quickContainer, { paddingHorizontal: QUICK_PADDING_H }]}>
          <View style={[UI.quickRow, { columnGap: QUICK_GAP, justifyContent: 'center' }]}>
            {quickItems.map((item) => (
              <Pressable
                key={item.key}
                style={[UI.quickItem, { width: quickItemWidth }]}
                onPress={item.onPress}
                hitSlop={8}>
              <Image source={item.source} style={UI.quickImage} resizeMode="contain" />
                <Text style={UI.quickLabel} numberOfLines={1} ellipsizeMode="tail">
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TravelLunchCard
          iconSource={require('@/assets/images/collection-cover.png')}
          visitedCount={travelProgress}
          title={t('home.collectionTitle')}
          subtitle={t('home.collectionSub')}
          ctaLabel={t('home.addStore')}
          onPress={() => router.push('/collection')}
          onAdd={() => router.push('/travel/new')}
        />

        <InlineAdBanner />

      </View>
    </View>
  );
}

