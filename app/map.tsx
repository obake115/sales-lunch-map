import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
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
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/src/i18n';
import type { Store } from '@/src/models';
import { useThemeColors } from '@/src/state/ThemeContext';
import { useStores } from '@/src/state/StoresContext';
import { getMemos } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
  } as const,
  primaryBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  dangerBtn: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  } as const,
  storeImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
  } as const,
  storeImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  storeImageText: {
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
  } as const,
  tagText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  } as const,
  titleText: {
    fontFamily: fonts.bold,
  } as const,
  bodyText: {
    fontFamily: fonts.regular,
  } as const,
} as const;

function toRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

async function openGoogleMaps(store: Store) {
  const query = store.placeId ? store.name : `${store.latitude},${store.longitude}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${
    store.placeId ? `&query_place_id=${encodeURIComponent(store.placeId)}` : ''
  }`;
  await Linking.openURL(url);
}

/* ── Marker colors ── */
const PIN_COLOR = '#D8849F';
const PIN_SELECTED_COLOR = '#C4748B';

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

export default function MapScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { stores, updateStore, deleteStore, loading } = useStores();
  const markerPressRef = useRef(false);
  const mapRef = useRef<MapView>(null);
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [memoPreviewByStoreId, setMemoPreviewByStoreId] = useState<Record<string, string>>({});
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const storesSorted = useMemo(
    () => stores.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [stores]
  );

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

  /* ── Photo picker ── */
  const handlePickStorePhoto = async (storeId: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('map.photoPermissionTitle'), t('map.photoPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (result.canceled) return;
    const newUris = result.assets?.map((a) => a.uri).filter(Boolean) ?? [];
    if (newUris.length === 0) return;
    const store = stores.find((s) => s.id === storeId);
    const existing = store?.photoUris ?? (store?.photoUri ? [store.photoUri] : []);
    const merged = [...existing, ...newUris].slice(0, 10);
    await updateStore(storeId, { photoUri: merged[0], photoUris: merged });
  };

  /* ── Location effects ── */
  useEffect(() => {
    (async () => {
      let fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) {
        fg = await Location.requestForegroundPermissionsAsync();
      }
      if (!fg.granted) {
        Alert.alert(
          t('locationDenied.title'),
          t('locationDenied.body'),
          [
            { text: t('locationDenied.cancel'), style: 'cancel' },
            { text: t('locationDenied.openSettings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (mapRegion) return;
    if (deviceLatLng) {
      setMapRegion(toRegion(deviceLatLng.latitude, deviceLatLng.longitude));
      return;
    }
    if (stores.length > 0) {
      setMapRegion(toRegion(stores[0].latitude, stores[0].longitude));
    }
  }, [mapRegion, deviceLatLng, stores]);

  useEffect(() => {
    let active = true;
    (async () => {
      const entries = await Promise.all(
        stores.map(async (s) => {
          const memos = await getMemos(s.id);
          const latest = memos.find((m) => !m.checked) ?? memos[0];
          return [s.id, latest?.text ?? ''] as const;
        })
      );
      if (!active) return;
      const next: Record<string, string> = {};
      for (const [id, text] of entries) {
        if (text) next[id] = text;
      }
      setMemoPreviewByStoreId(next);
    })();
    return () => {
      active = false;
    };
  }, [stores]);

  const selectedStore = useMemo(
    () => (selectedStoreId ? stores.find((s) => s.id === selectedStoreId) ?? null : null),
    [stores, selectedStoreId]
  );

  const tagLabel = (tag: string) => {
    if (tag === 'サクッと') return t('storeDetail.mood.quick');
    if (tag === 'ゆっくり') return t('storeDetail.mood.relaxed');
    if (tag === '接待向き') return t('storeDetail.mood.business');
    if (tag === '1人OK') return t('storeDetail.scene.solo');
    if (tag === 'ご褒美') return t('storeDetail.scene.reward');
    return tag;
  };

  const handleMarkerPress = useCallback((store: Store) => {
    markerPressRef.current = true;
    setSelectedStoreId(store.id);
    snapToIndex(1); // snap to 45%
    setTimeout(() => {
      markerPressRef.current = false;
    }, 0);
  }, [snapToIndex]);

  const handleCardPress = useCallback((store: Store) => {
    setSelectedStoreId(store.id);
    mapRef.current?.animateToRegion(toRegion(store.latitude, store.longitude), 400);
    snapToIndex(1); // snap to 45%
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
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setSelectedStoreId(null);
            router.push({ pathname: '/store/new', params: { lat: String(latitude), lng: String(longitude) } });
          }}>
          {stores.map((s) => {
            const isSelected = s.id === selectedStoreId;
            return (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                onPress={() => handleMarkerPress(s)}>
                <View style={styles.markerWrap}>
                  <View
                    style={[
                      styles.markerDot,
                      {
                        backgroundColor: isSelected ? PIN_SELECTED_COLOR : PIN_COLOR,
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
          <Text style={{ color: colors.subText }}>{t('map.locationLoading')}</Text>
        </View>
      )}

      {/* Beige tone overlay */}
      <View pointerEvents="none" style={styles.overlay} />

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

      {/* Custom BottomSheet */}
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

        <ScrollView
          scrollEnabled={scrollEnabled}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
          showsVerticalScrollIndicator={false}>

          {/* Title bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }}>
              {t('map.yourMap')}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.subText }}>
              {storesSorted.length}{t('map.storeCount')}
            </Text>
          </View>

          {/* Selected store card */}
          {selectedStore && (
            <NeuCard style={{ ...UI.card, backgroundColor: colors.card, gap: 8 }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }} numberOfLines={1}>
                {selectedStore.name}
              </Text>
              <Text style={{ color: colors.subText }} numberOfLines={2}>
                {memoPreviewByStoreId[selectedStore.id]
                  ? t('map.memoWithText', { text: memoPreviewByStoreId[selectedStore.id] })
                  : t('map.memoEmpty')}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: selectedStore.id } })}
                  style={{ flex: 1, ...UI.primaryBtn }}>
                  <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('map.detail')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => openGoogleMaps(selectedStore)}
                  style={{ flex: 1, ...UI.secondaryBtn, backgroundColor: colors.card, shadowColor: colors.shadowDark, paddingVertical: 12 }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('map.openGoogleMaps')}</Text>
                </Pressable>
              </View>
            </NeuCard>
          )}

          {/* Loading state */}
          {loading && <Text style={[UI.bodyText, { color: colors.subText }]}>{t('map.loading')}</Text>}

          {/* Empty state */}
          {!loading && storesSorted.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
              <Text style={{ fontSize: 40 }}>📍</Text>
              <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>{t('map.emptyTitle')}</Text>
              <Text style={{ fontSize: 13, color: colors.subText, textAlign: 'center' }}>{t('map.emptyBody')}</Text>
            </View>
          )}

          {/* Store list */}
          {storesSorted.map((item) => (
            <NeuCard key={item.id} style={{ borderRadius: 20 }}>
              <View style={{ position: 'relative' }}>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      t('map.deleteTitle'),
                      t('map.deleteBody', { name: item.name }),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('map.deleteConfirm'), style: 'destructive', onPress: () => deleteStore(item.id) },
                      ]
                    );
                  }}
                  style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, ...UI.dangerBtn, backgroundColor: colors.dangerBg }}>
                  <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold, fontSize: 18 }}>−</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleCardPress(item)}
                  style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Pressable onPress={() => handlePickStorePhoto(item.id)}>
                      {(item.photoUris?.length ?? 0) > 0 ? (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {(item.photoUris ?? []).slice(0, 3).map((uri, i) => (
                            <Image key={i} source={{ uri }} style={[UI.storeImage, { backgroundColor: colors.chipBg, width: 44, height: 44 }]} />
                          ))}
                          {(item.photoUris?.length ?? 0) > 3 && (
                            <View style={[UI.storeImage, UI.storeImagePlaceholder, { backgroundColor: colors.chipBg, width: 44, height: 44 }]}>
                              <Text style={{ color: colors.subText, fontFamily: fonts.extraBold, fontSize: 11 }}>+{(item.photoUris?.length ?? 0) - 3}</Text>
                            </View>
                          )}
                        </View>
                      ) : item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={[UI.storeImage, { backgroundColor: colors.chipBg }]} />
                      ) : (
                        <View style={[UI.storeImage, UI.storeImagePlaceholder, { backgroundColor: colors.chipBg }]}>
                          <Text style={[UI.storeImageText, { color: colors.subText }]}>{t('map.addPhoto')}</Text>
                        </View>
                      )}
                    </Pressable>
                    <View style={{ flex: 1, paddingRight: 28 }}>
                      <Text style={[UI.titleText, { fontSize: 16, color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[UI.bodyText, { color: colors.subText, marginTop: 2 }]}>
                        {t('map.radiusLabel', { value: item.remindRadiusM ?? 200 })}
                      </Text>
                      {item.moodTags?.length || item.sceneTags?.length ? (
                        <View style={UI.tagRow}>
                          {[...(item.moodTags ?? []), ...(item.sceneTags ?? [])].map((tag) => (
                            <View key={tag} style={[UI.tagChip, { backgroundColor: colors.chipBg }]}>
                              <Text style={[UI.tagText, { color: colors.subText }]}>{tagLabel(tag)}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>
            </NeuCard>
          ))}
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
    borderColor: 'rgba(200, 116, 139, 0.4)',
  },
});
