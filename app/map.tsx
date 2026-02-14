import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { t } from '@/src/i18n';
import type { Store } from '@/src/models';
import { useStores } from '@/src/state/StoresContext';
import { getMemos } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { PermissionNotice } from '@/src/ui/PermissionNotice';

const UI = {
  card: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  listBtn: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    alignItems: 'center',
  } as const,
  listBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  titleText: {
    fontWeight: '600',
  } as const,
  bodyText: {
    fontWeight: '400',
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

export default function MapScreen() {
  const router = useRouter();
  const { stores, updateStore, deleteStore, loading } = useStores();
  const markerPressRef = useRef(false);
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [memoPreviewByStoreId, setMemoPreviewByStoreId] = useState<Record<string, string>>({});
  const storesSorted = useMemo(
    () => stores.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [stores]
  );

  const handlePickStorePhoto = async (storeId: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('map.photoPermissionTitle'), t('map.photoPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    await updateStore(storeId, { photoUri: uri });
  };

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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 12 }}>
        <PermissionNotice />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.replace('/')}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>{t('map.backToList')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!deviceLatLng) return;
              setMapRegion(toRegion(deviceLatLng.latitude, deviceLatLng.longitude));
            }}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>{t('map.toCurrent')}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <View
            style={{
              height: 240,
              borderWidth: 1,
              borderColor: '#E7E2D5',
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: 'white',
            }}>
            {mapRegion ? (
              <MapView
                style={{ flex: 1 }}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                showsUserLocation
                showsMyLocationButton
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
                {stores.map((s) => (
                  <Marker
                    key={s.id}
                    coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                    onPress={() => {
                      markerPressRef.current = true;
                      setSelectedStoreId(s.id);
                      setTimeout(() => {
                        markerPressRef.current = false;
                      }, 0);
                    }}
                  />
                ))}
              </MapView>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#6B7280' }}>{t('map.locationLoading')}</Text>
              </View>
            )}
          </View>

          {selectedStore && (
            <View style={{ ...UI.card, gap: 8 }}>
              <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                {selectedStore.name}
              </Text>
              <Text style={{ color: '#6B7280' }} numberOfLines={2}>
                {memoPreviewByStoreId[selectedStore.id]
                  ? t('map.memoWithText', { text: memoPreviewByStoreId[selectedStore.id] })
                  : t('map.memoEmpty')}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: selectedStore.id } })}
                  style={{ flex: 1, ...UI.primaryBtn }}>
                  <Text style={{ color: 'white', fontWeight: '900' }}>{t('map.detail')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => openGoogleMaps(selectedStore)}
                  style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#111827' }}>{t('map.openGoogleMaps')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 6 }}>{t('map.yourMap')}</Text>
          <Pressable onPress={() => router.push('/list')} style={UI.listBtn}>
            <Text style={UI.listBtnText}>{t('map.showList')}</Text>
          </Pressable>
        </View>

        {loading && <Text style={[UI.bodyText, { color: '#6B7280' }]}>{t('map.loading')}</Text>}
        {!loading && storesSorted.length === 0 && (
          <Text style={[UI.bodyText, { color: '#6B7280' }]}>{t('map.empty')}</Text>
        )}

        {storesSorted.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}
            style={UI.card}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Pressable onPress={() => handlePickStorePhoto(item.id)}>
                {item.photoUri ? (
                  <Image source={{ uri: item.photoUri }} style={UI.storeImage} />
                ) : (
                  <View style={[UI.storeImage, UI.storeImagePlaceholder]}>
                    <Text style={UI.storeImageText}>{t('map.addPhoto')}</Text>
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[UI.titleText, { fontSize: 16 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[UI.bodyText, { color: '#6B7280', marginTop: 2 }]}>
                      {t('map.radiusLabel', { value: 200 })}
                    </Text>
                    {item.moodTags?.length || item.sceneTags?.length ? (
                      <View style={UI.tagRow}>
                        {[...(item.moodTags ?? []), ...(item.sceneTags ?? [])].map((tag) => (
                          <View key={tag} style={UI.tagChip}>
                            <Text style={UI.tagText}>{tagLabel(tag)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={() => deleteStore(item.id)} style={UI.dangerBtn}>
                    <Text style={{ color: '#B91C1C', fontWeight: '700' }}>{t('storeDetail.deleteConfirm')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
