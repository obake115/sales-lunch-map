import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { useAuth } from '@/src/state/AuthContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';
import { EveryoneHeroLabel } from '@/src/ui/EveryoneHeroLabel';
import { WeatherBackdrop } from '@/src/ui/WeatherBackdrop';
import type { WeatherTone } from '@/src/weather';
import { useEveryoneTone } from '@/src/weather/useEveryoneTone';
import { listenMapStores, listenMyMaps, type SharedMap, type SharedStore } from '@/src/sharedMaps';

/* ── Apricot color palette ── */
const APRICOT = '#F3A261';
const APRICOT_SELECTED = '#E8944F';
const APRICOT_RING = 'rgba(243, 162, 97, 0.4)';
const APRICOT_CHIP_INACTIVE = '#FDF0E2';

/* ── BottomSheet snap points ── */
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SNAP_PEEK = SCREEN_HEIGHT * 0.18;
const SNAP_HALF = SCREEN_HEIGHT * 0.45;
const SNAP_FULL = SCREEN_HEIGHT * 0.85;
const SNAPS = [SNAP_PEEK, SNAP_HALF, SNAP_FULL];

function closestSnap(y: number): number {
  let best = SNAPS[0];
  let bestDist = Math.abs(y - best);
  for (const s of SNAPS) {
    const d = Math.abs(y - s);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

const SPRING_CONFIG = { damping: 20, stiffness: 180, mass: 0.8 };

/* ── Helpers ── */

function toRegion(latitude: number, longitude: number): Region {
  return { latitude, longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 };
}

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
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

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function relativeTime(timestamp: number | undefined): string {
  if (!timestamp) return t('everyone.timeJustNow');
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('everyone.timeJustNow');
  if (minutes < 60) return t('everyone.timeMinutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('everyone.timeHoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('everyone.timeDaysAgo', { count: days });
}

const TAG_EMOJI: Record<string, string> = {
  favorite: '⭐',
  want: '📌',
  again: '🔄',
};

const WEATHER_SHADOW: Record<WeatherTone, number> = {
  sunny: 0.06, cloudy: 0.05, rain: 0.045, default: 0.06,
};

type FilterMode = 'nearest' | 'newest' | 'popular';

type CombinedStore = SharedStore & { mapName: string; distanceM?: number };

/* ── Filter Chip Component ── */
function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withTiming(0.92, { duration: 100 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 100 }); }}
      onPress={onPress}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: active
              ? APRICOT
              : colors.bg === '#0F172A' ? colors.chipBg : APRICOT_CHIP_INACTIVE,
          },
          animStyle,
        ]}>
        <Text
          style={[
            styles.chipText,
            {
              color: active
                ? '#FFFFFF'
                : colors.bg === '#0F172A' ? colors.text : '#3D2E1F',
            },
          ]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── Main Screen ── */

export default function EveryoneScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const markerPressRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const cardRefs = useRef<Record<string, number>>({});

  const isNavy = colors.bg === '#0F172A';

  const [maps, setMaps] = useState<SharedMap[]>([]);
  const [mapStores, setMapStores] = useState<Record<string, SharedStore[]>>({});
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('nearest');
  const [scrollEnabled, setScrollEnabled] = useState(false);

  const { resolvedTone, resolvedLabel } = useEveryoneTone({
    isNavy,
    lat: deviceLatLng?.latitude ?? null,
    lon: deviceLatLng?.longitude ?? null,
  });

  /* ── BottomSheet animation ── */
  const sheetHeight = useSharedValue(SNAP_PEEK);
  const currentSnap = useRef(SNAP_PEEK);
  const dragStartHeight = useRef(SNAP_PEEK);

  const snapTo = useCallback((target: number) => {
    'worklet';
    sheetHeight.value = withSpring(target, SPRING_CONFIG);
    runOnJS(setScrollEnabled)(target >= SNAP_FULL);
  }, [sheetHeight]);

  const snapToIndex = useCallback((index: number) => {
    const target = SNAPS[index] ?? SNAP_PEEK;
    currentSnap.current = target;
    sheetHeight.value = withSpring(target, SPRING_CONFIG);
    setScrollEnabled(target >= SNAP_FULL);
  }, [sheetHeight]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderGrant: () => {
      dragStartHeight.current = currentSnap.current;
    },
    onPanResponderMove: (_, g) => {
      const next = Math.max(SNAP_PEEK, Math.min(SNAP_FULL, dragStartHeight.current - g.dy));
      sheetHeight.value = next;
    },
    onPanResponderRelease: (_, g) => {
      const projected = dragStartHeight.current - g.dy - g.vy * 150;
      const target = closestSnap(projected);
      currentSnap.current = target;
      snapTo(target);
    },
  }), [sheetHeight, snapTo]);

  const sheetAnimStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  /* ── Location ── */
  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (mapRegion) return;
    if (deviceLatLng) {
      setMapRegion(toRegion(deviceLatLng.latitude, deviceLatLng.longitude));
    }
  }, [mapRegion, deviceLatLng]);

  /* ── Data subscriptions ── */
  useEffect(() => {
    if (!user) { setMaps([]); return; }
    const unsub = listenMyMaps(user.uid, setMaps);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!maps.length) { setMapStores({}); return; }
    const unsubs = maps.map((map) =>
      listenMapStores(map.id, (stores) => {
        setMapStores((prev) => ({ ...prev, [map.id]: stores }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [maps]);

  /* ── Combined + sorted stores ── */
  const mapNameById = useMemo(() => {
    const out: Record<string, string> = {};
    maps.forEach((m) => { out[m.id] = m.name; });
    return out;
  }, [maps]);

  const combinedStores = useMemo<CombinedStore[]>(() => {
    const merged = Object.entries(mapStores).flatMap(([mapId, stores]) =>
      stores.map((store) => ({
        ...store,
        mapName: mapNameById[mapId] ?? t('sharedDetail.defaultName'),
        distanceM: undefined as number | undefined,
      })),
    );
    if (deviceLatLng) {
      merged.forEach((s) => {
        s.distanceM = haversineMeters(deviceLatLng, { latitude: s.latitude, longitude: s.longitude });
      });
    }
    return merged;
  }, [mapStores, mapNameById, deviceLatLng]);

  const sortedStores = useMemo(() => {
    const arr = [...combinedStores];
    switch (filterMode) {
      case 'nearest':
        arr.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
        break;
      case 'newest':
      case 'popular': // popular behaves same as newest (no like data)
        arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        break;
    }
    return arr;
  }, [combinedStores, filterMode]);

  const displayStores = useMemo(() => sortedStores.slice(0, 10), [sortedStores]);

  const selectedStore = useMemo(
    () => (selectedStoreId ? displayStores.find((s) => s.id === selectedStoreId) ?? null : null),
    [displayStores, selectedStoreId],
  );

  /* ── Interactions ── */
  const handleMarkerPress = useCallback((store: CombinedStore) => {
    markerPressRef.current = true;
    setSelectedStoreId(store.id);
    snapToIndex(1);
    // scroll to card
    const yOffset = cardRefs.current[store.id];
    if (yOffset != null && scrollRef.current) {
      scrollRef.current.scrollTo({ y: yOffset, animated: true });
    }
    setTimeout(() => { markerPressRef.current = false; }, 0);
  }, [snapToIndex]);

  const handleCardPress = useCallback((store: CombinedStore) => {
    setSelectedStoreId(store.id);
    mapRef.current?.animateToRegion(toRegion(store.latitude, store.longitude), 400);
    snapToIndex(1);
  }, [snapToIndex]);

  const handleGoToCurrent = useCallback(() => {
    if (!deviceLatLng) return;
    mapRef.current?.animateToRegion(toRegion(deviceLatLng.latitude, deviceLatLng.longitude), 400);
  }, [deviceLatLng]);

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen MapView */}
      {mapRegion ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          onPress={(e) => {
            if (markerPressRef.current) {
              markerPressRef.current = false;
              return;
            }
            if ((e as any)?.nativeEvent?.action === 'marker-press') return;
            setSelectedStoreId(null);
          }}>
          {displayStores.map((s) => {
            const isSelected = s.id === selectedStoreId;
            return (
              <Marker
                key={`${s.id}-${s.mapName}`}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                onPress={() => handleMarkerPress(s)}>
                <View style={styles.markerWrap}>
                  <View
                    style={[
                      styles.markerDot,
                      {
                        backgroundColor: isSelected ? APRICOT_SELECTED : APRICOT,
                        width: isSelected ? 16 : 12,
                        height: isSelected ? 16 : 12,
                        borderRadius: isSelected ? 8 : 6,
                        ...(isSelected
                          ? { shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }
                          : { shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }),
                      },
                    ]}
                  />
                  {isSelected && <View style={styles.markerRing} />}
                </View>
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <Text style={{ color: colors.subText }}>{t('everyone.locationLoading')}</Text>
        </View>
      )}

      {/* Beige tone overlay */}
      <View pointerEvents="none" style={styles.overlay} />
      {/* Weather gradient (everyone only) */}
      <WeatherBackdrop tone={resolvedTone} />

      {/* Hero overlay (top center) */}
      <View
        pointerEvents="none"
        style={[
          styles.heroOverlay,
          {
            top: insets.top + 56,
            backgroundColor: isNavy
              ? 'rgba(15, 23, 42, 0.75)'
              : 'rgba(233, 228, 218, 0.8)',
          },
        ]}>
        <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text }}>
          {'🌍 ' + t('everyone.heroTitle')}
        </Text>
        <EveryoneHeroLabel
          weatherText={resolvedLabel}
          postCount={combinedStores.length}
          color={colors.subText}
        />
      </View>

      {/* Floating back button (top-left) */}
      <Pressable
        onPress={() => router.replace('/')}
        style={[
          styles.floatingBtn,
          {
            top: insets.top + 8,
            left: 16,
            backgroundColor: colors.card,
            shadowColor: colors.shadowDark,
          },
        ]}>
        <Text style={{ fontSize: 20, color: colors.text, fontFamily: fonts.bold }}>＜</Text>
      </Pressable>

      {/* Floating current-location button (top-right) */}
      <Pressable
        onPress={handleGoToCurrent}
        style={[
          styles.floatingBtn,
          {
            top: insets.top + 8,
            right: 16,
            backgroundColor: colors.card,
            shadowColor: colors.shadowDark,
          },
        ]}>
        <Text style={{ fontSize: 18, color: colors.text }}>◎</Text>
      </Pressable>

      {/* BottomSheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.card },
          sheetAnimStyle,
        ]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: colors.chipBg }]} />
        </View>

        {/* Filter chips */}
        <View style={styles.chipRow}>
          <FilterChip
            label={t('everyone.filterNearest')}
            active={filterMode === 'nearest'}
            onPress={() => setFilterMode('nearest')}
            colors={colors}
          />
          <FilterChip
            label={t('everyone.filterNewest')}
            active={filterMode === 'newest'}
            onPress={() => setFilterMode('newest')}
            colors={colors}
          />
          <FilterChip
            label={t('everyone.filterPopular')}
            active={filterMode === 'popular'}
            onPress={() => setFilterMode('popular')}
            colors={colors}
          />
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.subText, marginLeft: 'auto' }}>
            {t('everyone.storeCount', { count: combinedStores.length })}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          scrollEnabled={scrollEnabled}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
          showsVerticalScrollIndicator={false}>

          {/* Login required */}
          {!user && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
              <Text style={{ fontSize: 40 }}>🔒</Text>
              <Text style={{ fontSize: 13, color: colors.subText, textAlign: 'center' }}>
                {t('everyone.loginRequired')}
              </Text>
            </View>
          )}

          {/* Empty state */}
          {user && displayStores.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
              <Text style={{ fontSize: 40 }}>🍃</Text>
              <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>
                {t('everyone.emptyTitle')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.subText, textAlign: 'center' }}>
                {t('everyone.emptyBody')}
              </Text>
              <Pressable
                onPress={() => router.push('/shared')}
                style={[styles.ctaButton, { backgroundColor: APRICOT }]}>
                <Text style={{ color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 14 }}>
                  {'🌸 ' + t('everyone.emptyCta')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Store cards */}
          {displayStores.map((store) => {
            const isSelected = store.id === selectedStoreId;
            return (
              <View
                key={`${store.id}-${store.mapName}`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: WEATHER_SHADOW[resolvedTone],
                  shadowRadius: 3,
                }}>
                <NeuCard
                  onPress={() => handleCardPress(store)}
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    ...(isSelected ? { borderWidth: 1.5, borderColor: APRICOT } : {}),
                  }}>
                  <View
                    onLayout={(e) => { cardRefs.current[store.id] = e.nativeEvent.layout.y; }}>
                    <Text
                      style={{ fontFamily: fonts.extraBold, fontSize: 15, color: colors.text }}
                      numberOfLines={1}>
                      {store.name}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: APRICOT }}>
                        {store.mapName}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.subText }}>
                        {relativeTime(store.createdAt)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      {typeof store.distanceM === 'number' && (
                        <Text style={{ fontSize: 12, color: colors.subText, fontFamily: fonts.bold }}>
                          {'📍 ' + formatDistance(store.distanceM)}
                        </Text>
                      )}
                      {store.tag && (
                        <View style={[styles.tagChip, { backgroundColor: colors.chipBg }]}>
                          <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.subText }}>
                            {TAG_EMOJI[store.tag] ?? ''} {store.tag}
                          </Text>
                        </View>
                      )}
                    </View>

                    {store.memo ? (
                      <Text
                        style={{ fontSize: 12, color: colors.subText, marginTop: 6 }}
                        numberOfLines={2}>
                        {store.memo}
                      </Text>
                    ) : null}
                  </View>
                </NeuCard>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      <BottomAdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 225, 216, 0.08)',
    zIndex: 1,
  },
  heroOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    zIndex: 2,
    alignItems: 'center',
  },
  floatingBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  ctaButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  markerDot: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
  },
  markerRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: APRICOT_RING,
  },
});
