import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Image, InteractionManager, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { LoginBonusModal } from '@/src/components/LoginBonusModal';
import { MilestoneShareModal, type MilestoneType } from '@/src/components/MilestoneShareModal';
import { PremiumPaywall } from '@/src/components/PremiumPaywall';

import { formatYmd } from '@/src/domain/date';
import { t } from '@/src/i18n';
import { getCurrentBadge } from '@/src/domain/badges';
import { backfillFoodBadges, claimLoginBonusIfNeeded, getEarnedFoodBadges, getHasSeenOnboarding, getHasSeenWelcome, getHasSeenTutorial, setHasSeenTutorial, getLastPaywallShownAt, getLoginBonusState, getNearbyShownCount, getProfileAvatarUri, getSelectedBadgeId, getStores, getTravelLunchEntries, getTravelLunchProgress, setLastPaywallShownAt, getPaywallFivePrefShown, setPaywallFivePrefShown, getDistinctPrefectureCount, getAdImpressionCount, isFoodBadgeCollectionPurchased } from '@/src/storage';
import type { Store } from '@/src/models';
import { usePremium } from '@/src/state/PremiumContext';
import { useThemeColors, useThemeMode } from '@/src/state/ThemeContext';
import { preloadInterstitial } from '@/src/interstitialAd';
import { InlineAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';
import { canShowPaywall } from '@/src/paywallTrigger';



const UI = {
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
  } as const,
  buttonText: {
    fontFamily: fonts.medium,
  } as const,
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  profileImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
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

/**
 * Smart daily pick using scoring:
 *  - Favorite: +3
 *  - Staleness (not visited recently): +0~4
 *  - Time-band match: +2 if lunch hour & quick tag
 *  - Genre diversity (different mood from yesterday): +2
 *  - Seeded random factor: +0~2 (varies by day for fairness)
 */
function getDailyPick(stores: Store[]): Store | null {
  if (stores.length === 0) return null;

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const hour = now.getHours();
  const isLunchTime = hour >= 11 && hour < 14;

  // Simple seeded pseudo-random (deterministic per day)
  const seed = (dayOfYear * 2654435761) >>> 0;
  const rand = (i: number) => (((seed + i * 1013904223) >>> 0) % 1000) / 1000;

  // Yesterday's pick mood (for diversity)
  const yesterdaySeed = ((dayOfYear - 1) * 2654435761) >>> 0;

  const scored = stores.map((store, i) => {
    let score = 0;

    // Favorite boost
    if (store.isFavorite) score += 3;

    // Staleness: older = more likely to be recommended
    const ageMs = now.getTime() - (store.updatedAt ?? store.createdAt ?? 0);
    const ageDays = ageMs / 86400000;
    score += Math.min(4, ageDays / 7); // max +4 after 4 weeks

    // Time-band match: lunch time prefers quick stores
    if (isLunchTime && store.moodTags?.includes('サクッと')) score += 2;

    // Genre diversity: different mood tags from yesterday's top pick
    const yesterdayIdx = yesterdaySeed % stores.length;
    const yesterdayMoods = new Set(stores[yesterdayIdx]?.moodTags ?? []);
    const hasDifferentMood = (store.moodTags ?? []).some((t) => !yesterdayMoods.has(t));
    if (hasDifferentMood || !store.moodTags?.length) score += 2;

    // Seeded random factor for fairness
    score += rand(i) * 2;

    return { store, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].store;
}


function ProgressHero({
  visitedCount,
  foodBadgeCount,
  recentPrefName,
  colors,
  onPress,
  onBadgePress,
}: {
  visitedCount: number;
  foodBadgeCount: number;
  recentPrefName: string | null;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  onBadgePress: () => void;
}) {
  const remaining = 47 - visitedCount;
  const progress = visitedCount / 47;
  const percent = Math.round(progress * 100);
  const heroScale = useSharedValue(0.96);
  const heroOpacity = useSharedValue(0);

  useEffect(() => {
    heroScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    heroOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  const heroAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  const svgSize = 96;
  const strokeWidth = 7;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Animated.View style={heroAnimStyle}>
      <NeuCard style={{ padding: 18, backgroundColor: colors.card, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={onPress} style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={svgSize} height={svgSize} style={{ position: 'absolute' }}>
              <Circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke={colors.chipBg}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke={colors.accent}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
              />
            </Svg>
            <Text style={{ fontSize: 28, fontFamily: fonts.extraBold, color: colors.accent }}>
              {visitedCount}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.subText, marginTop: -2 }}>
              / 47
            </Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('home.progressTitle')}
            </Text>
            {visitedCount === 0 ? (
              <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.accent }}>
                {t('home.progressEmpty')}
              </Text>
            ) : (
              <>
                <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.subText }}>
                  {t('home.progressRemaining', { count: remaining })}
                  {'  '}
                  <Text style={{ fontFamily: fonts.bold, color: colors.accent }}>
                    {t('home.progressPercent', { percent })}
                  </Text>
                </Text>
                {recentPrefName && (
                  <Text style={{ fontSize: 11, fontFamily: fonts.medium, color: colors.subText, marginTop: 2 }}>
                    {t('home.recentPref', { name: recentPrefName })}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </NeuCard>
    </Animated.View>
  );
}

function RecordLunchFAB({
  colors,
  onOpen,
}: {
  colors: ReturnType<typeof useThemeColors>;
  onOpen: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 140 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: Math.max(insets.bottom, 16) + 16,
          zIndex: 100,
        },
        animStyle,
      ]}>
      <Pressable
        onPress={onOpen}
        onPressIn={() => { btnScale.value = withTiming(0.9, { duration: 100 }); }}
        onPressOut={() => { btnScale.value = withTiming(1, { duration: 100 }); }}>
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 6,
              gap: 6,
            },
            pressStyle,
          ]}>
          <FontAwesome name="plus" size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 14 }}>
            {t('home.recordLunch')}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function ActionMenu({
  visible,
  colors,
  onSelect,
  onClose,
  highlightTravel,
}: {
  visible: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onSelect: (route: string) => void;
  onClose: () => void;
  highlightTravel?: boolean;
}) {
  const tutorialHints: Record<string, string> = {
    map: t('home.tutorialMapHint'),
    travel: t('home.tutorialTravelHint'),
    shared: t('home.tutorialSharedHint'),
    album: t('home.tutorialAlbumHint'),
  };

  const items: { key: string; icon?: any; faIcon?: string; faColor?: string; label: string; desc: string; route: string }[] = [
    { key: 'map', icon: require('@/assets/images/quick-map.png'), label: t('home.actionMap'), desc: t('home.actionMapDesc'), route: '/store/new' },
    { key: 'travel', icon: require('@/assets/images/collection-cover.png'), label: t('home.actionTravel'), desc: t('home.actionTravelDesc'), route: '/travel/new' },
    { key: 'shared', icon: require('@/assets/images/quick-shared.png'), label: t('home.actionShared'), desc: t('home.actionSharedDesc'), route: '/shared' },
    { key: 'album', icon: require('@/assets/images/quick-album.png'), label: t('home.actionAlbum'), desc: t('home.actionAlbumDesc'), route: '/reminders' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 20,
          paddingBottom: 36,
          paddingHorizontal: 20,
        }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.chipBg, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 17, fontFamily: fonts.extraBold, color: colors.text, marginBottom: 16 }}>
            {t('home.recordLunch')}
          </Text>
          {items.map((item) => {
            const isTutorial = highlightTravel;
            const isRecommended = isTutorial && item.key === 'travel';
            return (
              <View key={item.key}>
                <Pressable
                  onPress={() => { onClose(); onSelect(item.route); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: isRecommended ? 10 : 0,
                    gap: 14,
                    borderRadius: isRecommended ? 14 : 0,
                    backgroundColor: isRecommended ? `${colors.accent}15` : 'transparent',
                    borderWidth: isRecommended ? 2 : 0,
                    borderColor: isRecommended ? colors.accent : 'transparent',
                  }}>
                  {item.icon ? (
                    <Image source={item.icon} style={{ width: 48, height: 48 }} resizeMode="contain" />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: (item.faColor ?? colors.primary) + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesome name={item.faIcon as any} size={22} color={item.faColor ?? colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text }}>
                        {item.label}
                      </Text>
                      {isRecommended && (
                        <View style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontFamily: fonts.extraBold, color: '#FFFFFF' }}>
                            {t('home.tutorialRecommend')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: isTutorial ? colors.text : colors.subText }}>
                      {isTutorial ? tutorialHints[item.key] : item.desc}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={colors.subText} />
                </Pressable>
              </View>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function StoreListScreen() {
  const router = useRouter();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [travelProgress, setTravelProgress] = useState(0);
  const { themeMode } = useThemeMode();
  const colors = useThemeColors();
  const { isPremium } = usePremium();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState('homeAdFree');
  const [adFreeShownToday, setAdFreeShownToday] = useState(false);
  const [loginStreak, setLoginStreak] = useState(0);
  const [badgeLabel, setBadgeLabel] = useState<string | null>(null);
  const [dailyPick, setDailyPick] = useState<Store | null>(null);
  const [allStoresCount, setAllStoresCount] = useState(0);
  const [foodBadgeCount, setFoodBadgeCount] = useState(0);
  const [foodBadgePurchased, setFoodBadgePurchased] = useState(false);
  const [todayStore, setTodayStore] = useState<Store | null>(null);
  const [recentPrefName, setRecentPrefName] = useState<string | null>(null);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('newPref');
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2>(0); // 0=off, 1=FAB highlight, 2=menu highlight
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const tutorialPendingRef = useRef(false); // tracks if user went to travel/new from tutorial
  const loginBonusShownRef = useRef(false);
  const [loginBonusVisible, setLoginBonusVisible] = useState(false);
  const [loginBonusStreak, setLoginBonusStreak] = useState(0);
  const [loginBonusTotalDays, setLoginBonusTotalDays] = useState(0);
  const [statsPreviewVisible, setStatsPreviewVisible] = useState(false);
  const insets = useSafeAreaInsets();


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

  // Login bonus: only show on HomeScreen after navigation is stable
  useEffect(() => {
    if (checkingOnboarding) return;
    if (loginBonusShownRef.current) return;
    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const result = await claimLoginBonusIfNeeded();
          if (result.awarded) {
            loginBonusShownRef.current = true;
            setLoginBonusStreak(result.state.streak);
            setLoginBonusTotalDays(result.state.totalDays);
            setLoginBonusVisible(true);
          }
        } catch {
          // ignore
        }
      })();
    });
    return () => task.cancel();
  }, [checkingOnboarding]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        await backfillFoodBadges();
        const [uri, progress, lastShown, bonusState, stores, nearbyCount, selectedBadge, foodBadges, badgePurchased] = await Promise.all([
          getProfileAvatarUri(),
          getTravelLunchProgress(),
          getLastPaywallShownAt(),
          getLoginBonusState(),
          getStores(),
          getNearbyShownCount(),
          getSelectedBadgeId(),
          getEarnedFoodBadges(),
          isFoodBadgeCollectionPurchased(),
        ]);
        if (!mounted) return;

        setAvatarUri(uri);
        setTravelProgress(progress);
        const today = formatYmd(new Date());
        setAdFreeShownToday(lastShown === today);
        setLoginStreak(bonusState.streak);
        setDailyPick(getDailyPick(stores));
        setAllStoresCount(stores.length);
        setFoodBadgeCount(foodBadges.length);
        setFoodBadgePurchased(badgePurchased);

        // Today's store
        const todayS = stores.find((s) => formatYmd(new Date(s.createdAt)) === today);
        setTodayStore(todayS ?? null);

        // Recent prefecture
        const travelEntries = await getTravelLunchEntries();
        if (travelEntries.length > 0) {
          const recentPrefId = travelEntries[0].prefectureId;
          setRecentPrefName(t(`prefectures.${recentPrefId}`) as string);
        } else {
          setRecentPrefName(null);
        }

        // Tutorial completion check
        if (tutorialPendingRef.current && travelEntries.length > 0) {
          tutorialPendingRef.current = false;
          setTimeout(() => setTutorialComplete(true), 500);
        }
        const badge = getCurrentBadge({
          storesCount: stores.length,
          favoritesCount: stores.filter((s) => s.isFavorite).length,
          nearbyShownCount: nearbyCount,
          totalLoginDays: bonusState.totalDays,
          loginStreak: bonusState.streak,
        });
        setBadgeLabel(badge.label);

        // Sub-triggers (only for non-premium)
        if (!isPremium) {
          // 5-prefecture trigger (one-time)
          const fivePrefShown = await getPaywallFivePrefShown();
          if (!fivePrefShown) {
            const prefCount = await getDistinctPrefectureCount(stores);
            if (prefCount >= 5 && await canShowPaywall()) {
              if (mounted) {
                setPaywallTrigger('fivePref');
                setPaywallVisible(true);
                await setPaywallFivePrefShown();
              }
              return;
            }
          }

          // Ad 3-times trigger
          const adCount = await getAdImpressionCount();
          if (adCount >= 3 && await canShowPaywall()) {
            if (mounted) {
              setPaywallTrigger('adImpression3');
              setPaywallVisible(true);
            }
            return;
          }
        }
      })();
      return () => {
        mounted = false;
      };
    }, [isPremium])
  );

  const handleAdFreePress = useCallback(async () => {
    const today = formatYmd(new Date());
    await setLastPaywallShownAt(today);
    setAdFreeShownToday(true);
    setPaywallTrigger('homeAdFree');
    setPaywallVisible(true);
  }, []);

  if (checkingOnboarding) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontFamily: fonts.extraBold, color: colors.text }}>
              {getGreeting()}
            </Text>
            {(badgeLabel || loginStreak >= 2) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {loginStreak >= 2 && (
                  <View style={{ backgroundColor: colors.accentBg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontFamily: fonts.extraBold, color: colors.accentText }}>
                      🔥 {t('home.streakBadge', { count: loginStreak })}
                    </Text>
                  </View>
                )}
                {badgeLabel && (
                  <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.accent }} numberOfLines={1}>
                    {badgeLabel}
                  </Text>
                )}
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => router.push('/settings')}
              style={[UI.iconBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }]}>
              <FontAwesome name="cog" size={18} color={colors.subText} />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')} style={[UI.profileBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={UI.profileImage} />
              ) : (
                <Text style={[UI.buttonText, { color: colors.text }]}>👤</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Hero: Prefecture Progress ── */}
        {allStoresCount === 0 && travelProgress === 0 ? (
          <NeuCard
            style={{ padding: 24, backgroundColor: colors.card, alignItems: 'center' }}
            onPress={() => router.push('/travel/new')}>
            <Text style={{ fontSize: 18, fontFamily: fonts.bold, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
              {t('home.firstTimeTitle')}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: fonts.regular, color: colors.subText, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
              {t('home.firstTimeBody')}
            </Text>
            <View style={[UI.primaryBtn, { paddingHorizontal: 32, backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 15 }}>
                {t('home.firstTimeCta')}
              </Text>
            </View>
          </NeuCard>
        ) : (
          <ProgressHero
            visitedCount={travelProgress}
            foodBadgeCount={foodBadgeCount}
            recentPrefName={recentPrefName}
            colors={colors}
            onPress={() => router.push('/collection')}
            onBadgePress={() => router.push('/food-badges')}
          />
        )}

        {/* ── Quick Nav ── */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.subText, marginBottom: 10 }}>
            {t('home.navSectionTitle')}
          </Text>
          <View style={{ gap: 8 }}>
            {[
              { icon: 'map-marker' as const, label: t('nav.map'), desc: t('home.navMapDesc'), route: '/map', iconColor: '#E67E22' },
              { icon: 'users' as const, label: t('nav.shared'), desc: t('home.navSharedDesc'), route: '/shared', iconColor: '#3498DB' },
              { icon: 'photo' as const, label: t('nav.reminders'), desc: t('home.navAlbumDesc'), route: '/reminders', iconColor: '#2ECC71' },
              { icon: 'globe' as const, label: t('nav.collection'), desc: t('home.navCollectionDesc'), route: '/collection', iconColor: '#9B59B6' },
              { icon: 'cutlery' as const, label: t('nav.foodBadges'), desc: t('home.navBadgesDesc'), route: '/food-badges', iconColor: '#E74C3C' },
              { icon: 'bar-chart' as const, label: t('nav.stats'), desc: t('home.navStatsDesc'), route: '/stats', iconColor: '#F39C12', premiumOnly: true },
            ].map((item) => (
              <Pressable
                key={item.route}
                onPress={() => {
                  if ((item as any).premiumOnly && !isPremium) {
                    setStatsPreviewVisible(true);
                    return;
                  }
                  router.push(item.route as any);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 12, shadowColor: colors.shadowDark, shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${item.iconColor}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome name={item.icon} size={15} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.text }}>{item.label}</Text>
                  <Text style={{ fontSize: 11, fontFamily: fonts.medium, color: colors.subText }}>{item.desc}</Text>
                </View>
                {(item as any).premiumOnly && !isPremium ? (
                  <FontAwesome name="lock" size={12} color={colors.accent} />
                ) : (
                  <FontAwesome name="chevron-right" size={10} color={colors.subText} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Ad ── */}
        <View style={{ marginTop: 14 }}>
          <InlineAdBanner />
        </View>

        {!isPremium && !adFreeShownToday && (
          <Pressable
            onPress={handleAdFreePress}
            style={{
              alignSelf: 'center',
              paddingVertical: 8,
              paddingHorizontal: 16,
              marginTop: 8,
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontFamily: fonts.bold }}>
              {t('paywall.homeAdFree')}
            </Text>
          </Pressable>
        )}

      </ScrollView>

      <PremiumPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger={paywallTrigger}
      />
      <LoginBonusModal
        visible={loginBonusVisible}
        streak={loginBonusStreak}
        totalDays={loginBonusTotalDays}
        onClose={() => setLoginBonusVisible(false)}
      />
      <MilestoneShareModal
        visible={milestoneVisible}
        milestoneType={milestoneType}
        visitedCount={travelProgress}
        storeCount={allStoresCount}
        onClose={() => setMilestoneVisible(false)}
      />
      <ActionMenu
        visible={actionMenuVisible}
        colors={colors}
        highlightTravel={tutorialStep === 2}
        onSelect={(route) => {
          if (tutorialStep === 2) {
            setTutorialStep(0);
            setHasSeenTutorial(true);
            if (route === '/travel/new') tutorialPendingRef.current = true;
          }
          router.push(route as any);
        }}
        onClose={() => {
          setActionMenuVisible(false);
          if (tutorialStep === 2) {
            setTutorialStep(0);
            setHasSeenTutorial(true);
          }
        }}
      />
      <RecordLunchFAB colors={colors} onOpen={() => {
        setActionMenuVisible(true);
        if (tutorialStep === 1) setTutorialStep(2);
      }} />

      {/* ── Tutorial overlay — Step 1: highlight FAB ── */}
      {tutorialStep === 1 && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
          }}
          onPress={() => {
            setTutorialStep(0);
            setHasSeenTutorial(true);
          }}
        >
          {/* Speech bubble above FAB */}
          <View style={{
            position: 'absolute',
            right: 20,
            bottom: Math.max(insets.bottom, 16) + 72,
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              maxWidth: 200,
            }}>
              <Text style={{ fontSize: 15, fontFamily: fonts.extraBold, color: '#111827', textAlign: 'center' }}>
                {t('home.tutorialStep1')}
              </Text>
            </View>
            {/* Triangle */}
            <View style={{
              width: 0, height: 0,
              borderLeftWidth: 10,
              borderRightWidth: 10,
              borderTopWidth: 10,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: '#FFFFFF',
              marginTop: -1,
            }} />
          </View>

          {/* Skip button */}
          <Pressable
            onPress={() => {
              setTutorialStep(0);
              setHasSeenTutorial(true);
            }}
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 }}>
              {t('home.tutorialSkip')}
            </Text>
          </Pressable>
        </Pressable>
      )}

      {/* ── Tutorial Complete Modal ── */}
      <Modal visible={tutorialComplete} transparent animationType="fade" onRequestClose={() => setTutorialComplete(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <NeuCard style={{
            width: 310,
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 28,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
            <Text style={{
              fontSize: 22,
              fontFamily: fonts.extraBold,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              {t('home.tutorialCompleteTitle')}
            </Text>
            <Text style={{
              fontSize: 14,
              fontFamily: fonts.medium,
              color: colors.subText,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 20,
            }}>
              {t('home.tutorialCompleteBody')}
            </Text>

            {/* Hints */}
            <View style={{ width: '100%', gap: 8, marginBottom: 24 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: `${colors.accent}12`,
                borderRadius: 12,
                padding: 12,
              }}>
                <Text style={{ fontSize: 16 }}>💡</Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: colors.text, flex: 1 }}>
                  {t('home.tutorialCompleteHint1')}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: `${colors.accent}12`,
                borderRadius: 12,
                padding: 12,
              }}>
                <Text style={{ fontSize: 16 }}>🏅</Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: colors.text, flex: 1 }}>
                  {t('home.tutorialCompleteHint2')}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setTutorialComplete(false)}
              style={{
                width: '100%',
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 28,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 16 }}>
                {t('home.tutorialCompleteButton')}
              </Text>
            </Pressable>
          </NeuCard>
        </View>
      </Modal>

      {/* ── Stats Preview Modal (free users) ── */}
      <Modal visible={statsPreviewVisible} transparent animationType="fade" onRequestClose={() => setStatsPreviewVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <NeuCard style={{ width: 340, backgroundColor: colors.card, borderRadius: 24, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📊</Text>
            <Text style={{ fontSize: 20, fontFamily: fonts.extraBold, color: colors.text, textAlign: 'center', marginBottom: 6 }}>
              {t('home.statsPreviewTitle')}
            </Text>
            <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.subText, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              {t('home.statsPreviewBody')}
            </Text>

            <View style={{ width: '100%', gap: 8, marginBottom: 20 }}>
              {[
                { emoji: '📅', text: t('home.statsFeature1') },
                { emoji: '🏆', text: t('home.statsFeature2') },
                { emoji: '📈', text: t('home.statsFeature3') },
                { emoji: '⭐', text: t('home.statsFeature4') },
              ].map((f, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${colors.accent}10`, borderRadius: 12, padding: 10 }}>
                  <Text style={{ fontSize: 18 }}>{f.emoji}</Text>
                  <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.text, flex: 1 }}>{f.text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => {
                setStatsPreviewVisible(false);
                setPaywallTrigger('stats');
                setPaywallVisible(true);
              }}
              style={{ width: '100%', backgroundColor: colors.accent, paddingVertical: 14, borderRadius: 28, alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 16 }}>
                {t('home.statsUnlock')}
              </Text>
            </Pressable>

            <Pressable onPress={() => setStatsPreviewVisible(false)} style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: colors.subText }}>
                {t('home.statsClose')}
              </Text>
            </Pressable>
          </NeuCard>
        </View>
      </Modal>
    </View>
  );
}
