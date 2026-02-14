import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker, type Region } from 'react-native-maps';

import { t } from '@/src/i18n';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { listenMapStores, listenMyMaps, type SharedMap, type SharedStore } from '@/src/sharedMaps';
import { useAuth } from '@/src/state/AuthContext';

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  } as const,
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 16,
    color: '#111827',
  } as const,
  subText: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 12,
  } as const,
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  } as const,
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  } as const,
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10,
  } as const,
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  } as const,
  chipText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
  } as const,
  mapCard: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    overflow: 'hidden',
    height: 220,
    backgroundColor: '#E8F0F1',
  } as const,
  mapOverlay: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  } as const,
  mapOverlayText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  } as const,
  cardRow: {
    flexDirection: 'row',
    gap: 10,
  } as const,
  placeCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFEF8',
    marginBottom: 10,
  } as const,
  placeImage: {
    width: '100%',
    height: 90,
    backgroundColor: '#F3F4F6',
  } as const,
  placeBody: {
    padding: 10,
    gap: 6,
  } as const,
  placeTitle: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 13,
  } as const,
  placeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as const,
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  } as const,
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  } as const,
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  } as const,
  shareText: {
    fontSize: 11,
    color: '#6B7280',
  } as const,
  emptyText: {
    color: '#6B7280',
    marginTop: 10,
  } as const,
} as const;

function toRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };
}

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

export default function EveryoneScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [maps, setMaps] = useState<SharedMap[]>([]);
  const [mapStores, setMapStores] = useState<Record<string, SharedStore[]>>({});
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setMaps([]);
      return;
    }
    const unsub = listenMyMaps(user.uid, setMaps);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!maps.length) {
      setMapStores({});
      return;
    }
    const unsubs = maps.map((map) =>
      listenMapStores(map.id, (stores) => {
        setMapStores((prev) => ({ ...prev, [map.id]: stores }));
      })
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, [maps]);

  const mapNameById = useMemo(() => {
    const out: Record<string, string> = {};
    maps.forEach((m) => {
      out[m.id] = m.name;
    });
    return out;
  }, [maps]);

  const combinedStores = useMemo(() => {
    const entries = Object.entries(mapStores);
    const merged = entries.flatMap(([mapId, stores]) =>
      stores.map((store) => ({
        ...store,
        mapName: mapNameById[mapId] ?? t('sharedDetail.defaultName'),
      }))
    );
    if (!deviceLatLng) return merged;
    return merged
      .map((store) => ({
        ...store,
        distanceM: haversineMeters(deviceLatLng, { latitude: store.latitude, longitude: store.longitude }),
      }))
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
  }, [mapStores, mapNameById, deviceLatLng]);

  const displayStores = useMemo(() => combinedStores.slice(0, 10), [combinedStores]);
  const region = useMemo<Region | null>(() => {
    if (deviceLatLng) return toRegion(deviceLatLng.latitude, deviceLatLng.longitude);
    if (combinedStores[0]) return toRegion(combinedStores[0].latitude, combinedStores[0].longitude);
    return null;
  }, [combinedStores, deviceLatLng]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <View style={UI.card}>
          <View style={UI.heroTitleRow}>
            <View>
              <Text style={{ fontWeight: '900', fontSize: 16 }}>{t('everyone.title')}</Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>{t('everyone.subtitle')}</Text>
            </View>
            <View style={UI.infoIcon}>
              <Text style={{ fontWeight: '900', color: '#6B7280' }}>i</Text>
            </View>
          </View>

          <View style={UI.chipRow}>
            <View style={UI.chip}>
              <Text style={UI.chipText}>{t('everyone.filterArea')}</Text>
            </View>
            <View style={UI.chip}>
              <Text style={UI.chipText}>{t('everyone.filterGenre')}</Text>
            </View>
            <View style={UI.chip}>
              <Text style={UI.chipText}>{t('everyone.filterPopular')}</Text>
            </View>
            <View style={UI.chip}>
              <Text style={UI.chipText}>≡</Text>
            </View>
          </View>

          <View style={UI.mapCard}>
            {region ? (
              <MapView style={{ flex: 1 }} region={region} showsUserLocation>
                {combinedStores.map((store) => (
                  <Marker
                    key={`${store.id}-${store.mapName}`}
                    coordinate={{ latitude: store.latitude, longitude: store.longitude }}
                    title={store.name}
                  />
                ))}
              </MapView>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={UI.emptyText}>{t('everyone.locationLoading')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ fontWeight: '900', marginBottom: 6 }}>{t('everyone.nearbyTitle')}</Text>
          {displayStores.length === 0 ? (
            <Text style={UI.emptyText}>
              {user ? t('everyone.empty') : t('everyone.loginRequired')}
            </Text>
          ) : (
            <View style={UI.cardRow}>
              <View style={{ flex: 1 }}>
                {displayStores.map((store) => (
                  <View key={`${store.id}-${store.mapName}`} style={UI.placeCard}>
                    <View style={UI.placeImage} />
                    <View style={UI.placeBody}>
                      <Text style={UI.placeTitle}>{store.name}</Text>
                      <View style={UI.placeMeta}>
                        {typeof store.distanceM === 'number' && (
                          <Text style={UI.shareText}>{Math.round(store.distanceM)}m</Text>
                        )}
                        <Text style={UI.shareText}>{store.mapName}</Text>
                      </View>
                      {store.memo ? <Text style={UI.shareText}>{store.memo}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomAdBanner />
    </View>
  );
}
