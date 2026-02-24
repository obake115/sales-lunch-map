import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Image, Pressable, Text, View, useWindowDimensions, type ImageStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { PremiumPaywall } from '@/src/components/PremiumPaywall';
import { TravelLunchCard } from '@/components/TravelLunchCard';
import { formatYmd } from '@/src/domain/date';
import { t } from '@/src/i18n';
import { getCurrentBadge } from '@/src/domain/badges';
import { getHasSeenOnboarding, getHasSeenWelcome, getLastPaywallShownAt, getLoginBonusState, getNearbyShownCount, getProfileAvatarUri, getSelectedBadgeId, getStores, getTravelLunchProgress, setLastPaywallShownAt } from '@/src/storage';
import type { Store } from '@/src/models';
import { usePremium } from '@/src/state/PremiumContext';
import { useThemeColors, useThemeMode } from '@/src/state/ThemeContext';
import { preloadInterstitial } from '@/src/interstitialAd';
import { InlineAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const QUICK_PADDING_H = 32;
const QUICK_GAP = 8;
const QUICK_ICON_SIZE = 76;

const UI = {
  card: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#E9E4DA',
  } as const,
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#E9E4DA',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  primaryBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
  } as const,
  buttonText: {
    fontFamily: fonts.medium,
  } as const,
  secondaryBtn: {
    backgroundColor: '#E9E4DA',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  dangerBtn: {
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
    fontFamily: fonts.bold,
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
    backgroundColor: '#E9E4DA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E9E4DA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
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
    fontFamily: fonts.medium,
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
    backgroundColor: '#D5D0C6',
  } as const,
  storeImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  storeImageText: {
    color: '#6B7280',
    fontFamily: fonts.bold,
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
    backgroundColor: '#D5D0C6',
  } as const,
  tagText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: fonts.bold,
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
    fontFamily: fonts.bold,
  } as const,
  titleText: {
    fontFamily: fonts.bold,
  } as const,
  bodyText: {
    fontFamily: fonts.regular,
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return t('home.greetingMorning');
  if (hour < 14) return t('home.greetingLunch');
  if (hour < 18) return t('home.greetingAfternoon');
  return t('home.greetingEvening');
}

function getDailyPick(stores: Store[]): Store | null {
  if (stores.length === 0) return null;
  const favorites = stores.filter((s) => s.isFavorite);
  const pool = favorites.length > 0 ? favorites : stores;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return pool[dayOfYear % pool.length];
}

function QuickTile({
  item,
  width,
  colors,
}: {
  item: { key: string; label: string; source: any; onPress: () => void };
  width: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      style={[UI.quickItem, { width }]}
      onPress={item.onPress}
      onPressIn={() => { scale.value = withTiming(0.92, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 100 }); }}
      hitSlop={8}>
      <Animated.View style={animatedStyle}>
        <Image source={item.source} style={UI.quickImage} resizeMode="contain" />
      </Animated.View>
      <Text style={[UI.quickLabel, { color: colors.subText }]} numberOfLines={1} ellipsizeMode="tail">
        {item.label}
      </Text>
    </Pressable>
  );
}

export default function StoreListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [travelProgress, setTravelProgress] = useState(0);
  const { themeMode } = useThemeMode();
  const colors = useThemeColors();
  const { isPremium } = usePremium();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [adFreeShownToday, setAdFreeShownToday] = useState(false);
  const [loginStreak, setLoginStreak] = useState(0);
  const [badgeLabel, setBadgeLabel] = useState<string | null>(null);
  const [dailyPick, setDailyPick] = useState<Store | null>(null);
  const [allStoresCount, setAllStoresCount] = useState(0);

  const quickItemWidth = useMemo(
    () => (width - QUICK_PADDING_H * 2 - QUICK_GAP * 3) / 4,
    [width]
  );
  const quickItems = useMemo(
    () => [
      { key: 'map', label: t('nav.map'), source: require('@/assets/images/quick-map.png'), onPress: () => router.push('/map') },
      {
        key: 'collab',
        label: t('nav.shared'),
        source: require('@/assets/images/quick-shared.png'),
        onPress: () => router.push('/shared'),
      },
      {
        key: 'all',
        label: t('nav.everyone'),
        source: require('@/assets/images/quick-everyone.png'),
        onPress: () => router.push('/everyone'),
      },
      {
        key: 'album',
        label: t('nav.reminders'),
        source: require('@/assets/images/quick-album.png'),
        onPress: () => router.push('/reminders'),
      },
    ],
    [router]
  );

  useEffect(() => {
    preloadInterstitial();
  }, []);

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
        const seenOnboarding = await getHasSeenOnboarding();
        if (!mounted) return;
        if (!seenOnboarding) {
          const seenWelcome = await getHasSeenWelcome();
          if (!mounted) return;
          if (!seenWelcome) {
            router.replace('/welcome');
          } else {
            router.replace('/onboarding');
          }
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
        const [uri, progress, lastShown, bonusState, stores, nearbyCount, selectedBadge] = await Promise.all([
          getProfileAvatarUri(),
          getTravelLunchProgress(),
          getLastPaywallShownAt(),
          getLoginBonusState(),
          getStores(),
          getNearbyShownCount(),
          getSelectedBadgeId(),
        ]);
        if (mounted) {
          setAvatarUri(uri);
          setTravelProgress(progress);
          const today = formatYmd(new Date());
          setAdFreeShownToday(lastShown === today);
          setLoginStreak(bonusState.streak);
          setDailyPick(getDailyPick(stores));
          setAllStoresCount(stores.length);
          const badge = getCurrentBadge({
            storesCount: stores.length,
            favoritesCount: stores.filter((s) => s.isFavorite).length,
            nearbyShownCount: nearbyCount,
            totalLoginDays: bonusState.totalDays,
            loginStreak: bonusState.streak,
          });
          setBadgeLabel(badge.label);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [])
  );

  const handleAdFreePress = useCallback(async () => {
    const today = formatYmd(new Date());
    await setLastPaywallShownAt(today);
    setAdFreeShownToday(true);
    setPaywallVisible(true);
  }, []);

  if (checkingOnboarding) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingTop: 24, paddingBottom: 110 }}>
        {(badgeLabel || loginStreak >= 2) && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {loginStreak >= 2 && (
              <View style={{ backgroundColor: '#FDE68A', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, fontFamily: fonts.extraBold, color: '#92400E' }}>
                  🔥 {t('home.streakBadge', { count: loginStreak })}
                </Text>
              </View>
            )}
            {badgeLabel && (
              <Text style={{ fontSize: 10, fontFamily: fonts.extraBold, color: '#F59E0B' }} numberOfLines={1}>
                {badgeLabel}
              </Text>
            )}
          </View>
        )}
        <View style={UI.headerRow}>
          <Text style={[UI.headerTitle, { flex: 1, color: colors.text }]} numberOfLines={1}>
            {getGreeting()}
          </Text>
          <View style={UI.headerActions}>
              <Pressable
                onPress={async () => {
                  const allStores = await getStores();
                  const storeCount = allStores.length;
                  const reminderCount = allStores.filter((s) => s.remindEnabled).length;
                  Alert.alert(t('home.noticeTitle'), t('home.noticeBody', { storeCount, reminderCount }));
                }}
                style={[UI.iconBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
                <FontAwesome name="bell-o" size={18} color="#F59E0B" />
              </Pressable>
              <Pressable
                onPress={() => router.push('/stats')}
                style={[UI.iconBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
                <FontAwesome name="bar-chart" size={16} color="#F59E0B" />
              </Pressable>
              <Pressable
                onPress={() => router.push('/settings')}
                style={[UI.iconBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
                <FontAwesome name="cog" size={18} color="#6B7280" />
              </Pressable>
            <Pressable onPress={() => router.push('/profile')} style={[UI.profileBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={UI.profileImage} />
              ) : (
                <Text style={[UI.buttonText, { color: colors.text }]}>👤</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Today's Pick Card */}
        {allStoresCount > 0 && dailyPick ? (
          <NeuCard
            style={{ padding: 14, marginBottom: 12, backgroundColor: colors.card }}
            onPress={() => router.push({ pathname: '/store/[id]', params: { id: dailyPick.id } })}>
            <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: '#F59E0B', marginBottom: 4 }}>
              {t('home.todayPick')}
            </Text>
            <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
              {dailyPick.name}
            </Text>
            {dailyPick.note ? (
              <Text style={{ fontSize: 13, color: colors.subText, marginTop: 2 }} numberOfLines={2}>
                {dailyPick.note}
              </Text>
            ) : null}
          </NeuCard>
        ) : allStoresCount === 0 ? (
          <NeuCard
            style={{ padding: 14, marginBottom: 12, backgroundColor: colors.card }}
            onPress={() => router.push('/map')}>
            <Text style={{ fontSize: 14, color: colors.subText, textAlign: 'center' }}>
              {t('home.todayPickEmpty')}
            </Text>
          </NeuCard>
        ) : null}

        <View style={[UI.quickContainer, { paddingHorizontal: QUICK_PADDING_H }]}>
          <View style={[UI.quickRow, { columnGap: QUICK_GAP, justifyContent: 'center' }]}>
            {quickItems.map((item) => (
              <QuickTile key={item.key} item={item} width={quickItemWidth} colors={colors} />
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

        {!isPremium && !adFreeShownToday && (
          <Pressable
            onPress={handleAdFreePress}
            style={{
              alignSelf: 'center',
              paddingVertical: 8,
              paddingHorizontal: 16,
              marginTop: 4,
            }}
          >
            <Text style={{ color: '#4F78FF', fontSize: 13, fontFamily: fonts.bold }}>
              {t('paywall.homeAdFree')}
            </Text>
          </Pressable>
        )}

      </View>

      <PremiumPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger="homeAdFree"
      />
    </View>
  );
}
