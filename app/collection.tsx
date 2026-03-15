import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { t } from '@/src/i18n';
import { fonts } from '@/src/ui/fonts';
import { useThemeColors } from '@/src/state/ThemeContext';
import { deleteTravelLunchEntry, getAllPurchasedBgIds, getEarnedFoodBadges, getMapBackground, getTravelLunchEntries, isFoodBadgeCollectionPurchased, isPremiumUser, setMapBackground, setMapBgPurchased, toggleTravelLunchFavorite, updateTravelLunchEntryImage } from '@/src/storage';
import { purchaseMapBackground } from '@/src/purchases';
import { MAP_BACKGROUNDS, type MapBackgroundId } from '@/src/domain/mapBackgrounds';
import { getVisibleFoodBadges } from '@/src/domain/getVisibleFoodBadges';
import { FOOD_BADGE_POSITIONS } from '@/src/domain/foodBadgePositions';
import { getFoodBadge } from '@/src/domain/foodBadges';
import { captureAndShare } from '@/src/shareCardCapture';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { JapanMapInteractive } from '@/src/ui/JapanMapInteractive';
import { NeuCard } from '@/src/ui/NeuCard';
import { SafeImage } from '@/src/ui/SafeImage';
import type { TravelLunchEntry } from '@/src/models';

// ─── Map colors ─────────────────────────────────────
const UNVISITED_FILL = '#F3EFE8';
const VISITED_FILL = '#E78FB3';
const SELECTED_FILL = '#EC4899';
const MAP_STROKE = '#D5D0C6';

const UI = {
  title: { fontSize: 18, fontFamily: fonts.extraBold, marginBottom: 12 } as const,
  hint: { marginBottom: 12 } as const,
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 } as const,
  backText: { fontFamily: fonts.bold } as const,
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: fonts.bold } as const,
  headerSpacer: { width: 36 } as const,
  mapWrap: { marginTop: 8, marginBottom: 12, marginHorizontal: -16, alignItems: 'center' } as const,
  legend: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: -4, marginRight: 8, marginBottom: 4 } as const,
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: VISITED_FILL } as const,
  legendText: { fontSize: 11, fontFamily: fonts.medium } as const,
  toastWrap: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center', zIndex: 10 } as const,
  toast: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const,
  toastText: { fontSize: 13, fontFamily: fonts.bold } as const,
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 } as const,
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: SELECTED_FILL } as const,
  chipText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 } as const,
  chipClose: { marginLeft: 4, color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 } as const,
  cardAreaHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 } as const,
  cardAreaTitle: { flex: 1, fontSize: 14, fontFamily: fonts.bold } as const,
  cardRow: { flexDirection: 'row', gap: 12 } as const,
  card: { width: 220, borderRadius: 20, overflow: 'hidden' } as const,
  cardImage: { width: '100%', height: 140 } as const,
  cardBody: { padding: 12 } as const,
  cardTitle: { fontSize: 14, fontFamily: fonts.bold, marginBottom: 4 } as const,
  cardMeta: { fontSize: 12, marginBottom: 4 } as const,
  cardMemo: { fontSize: 12 } as const,
  emptyCard: { borderRadius: 20, padding: 16 } as const,
  emptyTitle: { fontSize: 14, fontFamily: fonts.bold } as const,
  emptyBody: { marginTop: 6, fontSize: 12 } as const,
  emptyBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 28, alignItems: 'center' } as const,
  emptyBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 } as const,
} as const;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [posts, setPosts] = useState<TravelLunchEntry[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ name: string; count: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showCards, setShowCards] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [visibleBadges, setVisibleBadges] = useState<Set<string>>(new Set());
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [badgePurchased, setBadgePurchased] = useState(false);
  const [premium, setPremium] = useState(false);
  const [purchasedBgs, setPurchasedBgs] = useState<Set<string>>(new Set());
  const shareRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [bgId, setBgId] = useState<MapBackgroundId>('none');
  const [mapSize, setMapSize] = useState(0);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // ── Pinch-to-zoom ──
  const mapScale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const mapTranslateX = useSharedValue(0);
  const mapTranslateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = useMemo(() => Gesture.Pinch()
    .onUpdate((e) => {
      mapScale.value = Math.max(1, Math.min(4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = mapScale.value;
      if (mapScale.value <= 1.05) {
        mapScale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
        mapTranslateX.value = withTiming(0, { duration: 200 });
        mapTranslateY.value = withTiming(0, { duration: 200 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    }), []);

  const panGesture = useMemo(() => Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      mapTranslateX.value = savedTranslateX.value + e.translationX;
      mapTranslateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = mapTranslateX.value;
      savedTranslateY.value = mapTranslateY.value;
    }), []);

  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        mapScale.value = withTiming(1, { duration: 250 });
        savedScale.value = 1;
        mapTranslateX.value = withTiming(0, { duration: 250 });
        mapTranslateY.value = withTiming(0, { duration: 250 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        mapScale.value = withTiming(2.5, { duration: 250 });
        savedScale.value = 2.5;
      }
    }), []);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [pinchGesture, panGesture]
  );

  const mapAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: mapTranslateX.value },
      { translateY: mapTranslateY.value },
      { scale: mapScale.value },
    ],
  }));

  // ── Derived data ──
  const visitedPrefectures = useMemo(() => new Set(posts.map((p) => p.prefectureId)), [posts]);

  const prefCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    posts.forEach((p) => {
      map[p.prefectureId] = (map[p.prefectureId] || 0) + 1;
    });
    return map;
  }, [posts]);

  // Only prefs with 3+ posts breathe
  const breathingPrefs = useMemo(() => {
    const set = new Set<string>();
    for (const [id, count] of Object.entries(prefCountMap)) {
      if (count >= 3) set.add(id);
    }
    return set;
  }, [prefCountMap]);

  const visiblePosts = useMemo(() => {
    const sorted = posts.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (!selectedPrefecture) return sorted;
    return sorted.filter((p) => p.prefectureId === selectedPrefecture);
  }, [posts, selectedPrefecture]);

  const refresh = useCallback(async () => {
    const [list, earned, purchased, storedBg, prem, bgPurchased] = await Promise.all([
      getTravelLunchEntries(),
      getEarnedFoodBadges(),
      isFoodBadgeCollectionPurchased(),
      getMapBackground(),
      isPremiumUser(),
      getAllPurchasedBgIds(),
    ]);
    setPosts(list);
    setEarnedBadges(earned);
    setBadgePurchased(purchased);
    setPremium(prem);
    setPurchasedBgs(bgPurchased);
    setBgId(storedBg as MapBackgroundId);
    const { visible } = getVisibleFoodBadges(earned, purchased);
    setVisibleBadges(visible);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Cleanup toast timer
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const selectedName = selectedPrefecture ? t(`prefectures.${selectedPrefecture}`) : null;

  const clearSelection = useCallback(() => {
    setSelectedPrefecture(null);
    setToastInfo(null);
  }, []);

  const handleMapSelect = useCallback((prefId: string) => {
    const count = prefCountMap[prefId] || 0;
    if (count === 0) {
      // No records — clear selection, no toast
      clearSelection();
      return;
    }
    // Toggle selection + show toast
    const isDeselecting = selectedPrefecture === prefId;
    setSelectedPrefecture((prev) => (prev === prefId ? null : prefId));
    setToastInfo({ name: t(`prefectures.${prefId}`), count });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastInfo(null), 1500);
  }, [prefCountMap, clearSelection, selectedPrefecture]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View style={UI.header}>
          <Pressable onPress={() => router.back()} style={{ width: 36 }}>
            <Text style={[UI.backText, { color: colors.text, fontSize: 20 }]}>{'＜'}</Text>
          </Pressable>
          <Text style={[UI.headerTitle, { color: colors.text }]}>{t('collection.title')}</Text>
          <View style={UI.headerSpacer} />
        </View>
        <View style={UI.mapWrap}>
          <View style={{ overflow: 'hidden' }}>
          <GestureDetector gesture={composedGesture}>
          <Animated.View style={mapAnimStyle}>
          {(() => {
            const activeBg = MAP_BACKGROUNDS.find((b) => b.id === bgId);
            const mapSvg = (
              <JapanMapInteractive
                onSelect={handleMapSelect}
                onBackgroundPress={clearSelection}
                selectedPref={selectedPrefecture}
                visitedPrefs={visitedPrefectures}
                fillDefault={bgId !== 'none' ? 'rgba(243,239,232,0.45)' : UNVISITED_FILL}
                fillVisited={VISITED_FILL}
                fillSelected={SELECTED_FILL}
                stroke={bgId !== 'none' ? 'rgba(213,208,198,0.6)' : MAP_STROKE}
                breathing
                breathingPrefs={breathingPrefs}
              />
            );
            return (
              <View ref={shareRef} collapsable={false} style={{ position: 'relative' }}
                onLayout={(e) => setMapSize(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))}
              >
                {activeBg?.source ? (
                  <ImageBackground
                    source={activeBg.source}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                    imageStyle={{ borderRadius: 16 }}
                    resizeMode="cover"
                  >
                    {mapSvg}
                  </ImageBackground>
                ) : mapSvg}
                {/* Badge overlay — outside ImageBackground to avoid clipping */}
                {showBadges && mapSize > 0 && <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{FOOD_BADGE_POSITIONS.map((pos) => {
                  if (!visibleBadges.has(pos.prefectureId)) return null;
                  const badge = getFoodBadge(pos.prefectureId);
                  if (!badge) return null;
                  const scale = pos.scale ?? 1;
                  const size = 48 * scale;
                  const left = (pos.x / 1000) * mapSize - size / 2;
                  const top = (pos.y / 1000) * mapSize - size / 2;
                  return (
                    <Image
                      key={pos.prefectureId}
                      source={badge.imageSource}
                      style={{
                        position: 'absolute',
                        left,
                        top,
                        width: size,
                        height: size,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                      }}
                      resizeMode="contain"
                    />
                  );
                })}</View>}
                {/* Share overlay text — only shown during capture */}
                {showShareOverlay && (
                  <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.extraBold, color: '#111827', textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 }}>
                      {t('home.progressTitle')}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#6B7280', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 }}>
                      {visitedPrefectures.size} / 47 {t('collection.legendVisited')}　{earnedBadges.length} / 47 {t('collection.badgeToggle')}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
          </Animated.View>
          </GestureDetector>
          </View>
          {/* Toast pill */}
          {toastInfo && (
            <View style={UI.toastWrap} pointerEvents="none">
              <View style={[UI.toast, { backgroundColor: colors.card }]}>
                <Text style={[UI.toastText, { color: colors.text }]}>
                  {toastInfo.name} / {t('collection.memoryCount', { count: toastInfo.count })}
                  {toastInfo.count >= 5 ? '  🌸' : ''}
                </Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginHorizontal: 24, marginBottom: 4 }}>
            {visitedPrefectures.size > 0 ? (
              <Pressable
                onPress={() => setShowCards((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: showCards ? colors.accentBg : colors.chipBg,
                }}
              >
                <View style={UI.legendDot} />
                <Text style={{
                  fontSize: 11,
                  fontFamily: fonts.bold,
                  color: showCards ? colors.accentText : colors.subText,
                }}>{t('collection.legendVisited')}</Text>
              </Pressable>
            ) : <View />}
            {visibleBadges.size > 0 && (
              <Pressable
                onPress={() => setShowBadges((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: showBadges ? colors.accentBg : colors.chipBg,
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontFamily: fonts.bold,
                  color: showBadges ? colors.accentText : colors.subText,
                }}>{t('collection.badgeToggle')}</Text>
              </Pressable>
            )}
          </View>
          {/* Background picker */}
          <View style={{ marginTop: 8, marginHorizontal: 8 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.subText, marginBottom: 6 }}>
              {t('collection.bgLabel')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {MAP_BACKGROUNDS.map((bg) => {
                  const isActive = bg.id === bgId;
                  const locked = bg.premium && !premium && !purchasedBgs.has(bg.id);
                  return (
                    <Pressable
                      key={bg.id}
                      onPress={async () => {
                        if (locked) {
                          // Preview the background first, then show alert after delay
                          setBgId(bg.id);
                          scrollRef.current?.scrollTo({ y: 0, animated: true });
                          setTimeout(() => Alert.alert(
                            t('foodBadges.lockedTitle'),
                            t('foodBadges.lockedBody'),
                            [
                              {
                                text: t('common.cancel'),
                                style: 'cancel',
                                onPress: async () => {
                                  // Revert to saved background
                                  const saved = await getMapBackground();
                                  setBgId(saved as MapBackgroundId);
                                },
                              },
                              {
                                text: t('foodBadges.unlockButton'),
                                onPress: async () => {
                                  const result = await purchaseMapBackground(bg.id);
                                  if (result.success) {
                                    await setMapBgPurchased(bg.id);
                                    setPurchasedBgs((prev) => new Set([...prev, bg.id]));
                                    await setMapBackground(bg.id);
                                  } else {
                                    const saved = await getMapBackground();
                                    setBgId(saved as MapBackgroundId);
                                  }
                                },
                              },
                            ],
                          ), 1200);
                          return;
                        }
                        setBgId(bg.id);
                        await setMapBackground(bg.id);
                      }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isActive ? colors.pink : colors.border,
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: bg.source ? undefined : colors.inputBg,
                      }}
                    >
                      {bg.source ? (
                        <Image source={bg.source} style={{ width: 52, height: 52 }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 18 }}>🚫</Text>
                      )}
                      {locked && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 20 }}>🔒</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
        {showCards && visiblePosts.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[UI.cardAreaTitle, { color: colors.text }]}>
                {selectedName ? t('collection.cardTitleSelected', { name: selectedName }) : t('collection.cardTitleRecent')}
              </Text>
              {selectedPrefecture ? (
                <Pressable onPress={() => setSelectedPrefecture(null)} style={{ marginLeft: 8 }}>
                  <View style={UI.chip}>
                    <Text style={UI.chipText}>{selectedName}</Text>
                    <Text style={UI.chipClose}> ✕</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={UI.cardRow}>
                {visiblePosts.map((post) => {
                  const prefName = t(`prefectures.${post.prefectureId}`);
                  return (
                    <NeuCard key={post.id} style={[UI.card, { backgroundColor: colors.card }]}>
                      <View style={{ position: 'relative' }}>
                        <Pressable
                          onPress={() => {
                            Alert.alert(
                              t('collection.deleteTitle'),
                              t('collection.deleteBody', { name: post.restaurantName }),
                              [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                  text: t('collection.deleteConfirm'),
                                  style: 'destructive',
                                  onPress: async () => {
                                    await deleteTravelLunchEntry(post.id);
                                    await refresh();
                                  },
                                },
                              ]
                            );
                          }}
                          style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(254,242,242,0.9)' }}>
                          <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold, fontSize: 14 }}>−</Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (!permission.granted) {
                              Alert.alert(t('pref.photoPermissionTitle'), t('pref.photoPermissionBody'));
                              return;
                            }
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ['images'],
                              allowsEditing: true,
                              quality: 0.8,
                            });
                            if (result.canceled) return;
                            const uri = result.assets?.[0]?.uri;
                            if (!uri) return;
                            await updateTravelLunchEntryImage(post.id, uri);
                            await refresh();
                          }}>
                          <SafeImage uri={post.imageUri} style={[UI.cardImage, { backgroundColor: colors.chipBg }]} />
                        </Pressable>
                        <Pressable onPress={() => router.push(`/travel/pref/${post.prefectureId}`)}>
                          <View style={UI.cardBody}>
                            <Text style={[UI.cardTitle, { color: colors.text }]} numberOfLines={1}>{prefName}｜{post.restaurantName}</Text>
                            <Text style={[UI.cardMeta, { color: colors.subText }]} numberOfLines={1}>{post.genre} | {post.visitedAt}</Text>
                            {post.memo ? <Text style={[UI.cardMemo, { color: colors.subText }]} numberOfLines={1}>{post.memo}</Text> : null}
                            {post.url ? (
                              <Pressable onPress={() => Linking.openURL(post.url!)} style={{ marginTop: 2 }}>
                                <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontSize: 11 }} numberOfLines={1}>{post.url}</Text>
                              </Pressable>
                            ) : null}
                            <Pressable
                              onPress={async (e) => {
                                e.stopPropagation();
                                await toggleTravelLunchFavorite(post.id);
                                await refresh();
                              }}
                              style={{ position: 'absolute', bottom: 4, right: 4, padding: 4 }}>
                              <Text style={{ fontSize: 18 }}>{post.isFavorite ? '★' : '☆'}</Text>
                            </Pressable>
                          </View>
                        </Pressable>
                      </View>
                    </NeuCard>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            setShowShareOverlay(true);
            setTimeout(async () => {
              try {
                const message = t('foodBadges.shareMessage', { count: earnedBadges.length });
                await captureAndShare(shareRef.current, message);
              } finally {
                setShowShareOverlay(false);
              }
            }, 300);
          }}
          style={{
            backgroundColor: colors.pink,
            paddingVertical: 14,
            borderRadius: 28,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <Text style={{ color: 'white', fontFamily: fonts.extraBold, fontSize: 15 }}>
            📸 {t('foodBadges.shareButton')}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomAdBanner />
    </SafeAreaView>
  );
}
