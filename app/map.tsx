import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

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
  const { stores } = useStores();
  const markerPressRef = useRef(false);
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [memoPreviewByStoreId, setMemoPreviewByStoreId] = useState<Record<string, string>>({});

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

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110, gap: 12 }}>
        <PermissionNotice />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>一覧へ戻る</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!deviceLatLng) return;
              setMapRegion(toRegion(deviceLatLng.latitude, deviceLatLng.longitude));
            }}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>現在地へ</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          <View
            style={{
              flex: 1,
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
                  setSelectedStoreId(null);
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
                <Text style={{ color: '#6B7280' }}>位置情報を取得中…</Text>
              </View>
            )}
          </View>

          {selectedStore && (
            <View style={{ ...UI.card, gap: 8 }}>
              <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                {selectedStore.name}
              </Text>
              <Text style={{ color: '#6B7280' }} numberOfLines={2}>
                {memoPreviewByStoreId[selectedStore.id] ? `メモ: ${memoPreviewByStoreId[selectedStore.id]}` : 'メモ: なし'}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: selectedStore.id } })}
                  style={{ flex: 1, ...UI.primaryBtn }}>
                  <Text style={{ color: 'white', fontWeight: '900' }}>詳細</Text>
                </Pressable>
                <Pressable
                  onPress={() => openGoogleMaps(selectedStore)}
                  style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#111827' }}>Googleマップで開く</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      <BottomAdBanner />
    </View>
  );
}
