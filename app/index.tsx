import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { useStores } from '@/src/state/StoresContext';
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
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  } as const,
  quickBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  } as const,
  quickText: {
    fontWeight: '500',
    color: '#555555',
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
  const { loading, stores, setStoreEnabled, deleteStore } = useStores();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'created' | 'name' | 'distance'>('created');
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (sortMode !== 'distance') return;
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, [sortMode]);

  const content = useMemo(() => {
    if (loading) return <Text style={[UI.bodyText, { color: '#6B7280' }]}>読み込み中...</Text>;
    if (stores.length === 0) return <Text style={[UI.bodyText, { color: '#6B7280' }]}>まずは店舗を追加してください。</Text>;
    return null;
  }, [loading, stores.length]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? stores.filter((s) => s.name.toLowerCase().includes(q)) : stores.slice();

    if (sortMode === 'name') {
      return filtered.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    }
    if (sortMode === 'distance') {
      if (!deviceLatLng) return filtered;
      return filtered.sort((a, b) => {
        const da = haversineMeters(deviceLatLng, { latitude: a.latitude, longitude: a.longitude });
        const db = haversineMeters(deviceLatLng, { latitude: b.latitude, longitude: b.longitude });
        return da - db;
      });
    }
    // created (default): newest first based on createdAt if available, else keep order
    return filtered.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [stores, query, sortMode, deviceLatLng]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <PermissionNotice />

        <View style={UI.headerRow}>
          <Text style={UI.headerTitle}>営業ランチマップ</Text>
          <Pressable onPress={() => router.push('/profile')} style={UI.profileBtn}>
            <Text style={[UI.buttonText, { color: '#111827' }]}>👤</Text>
          </Pressable>
        </View>

        <View style={UI.quickRow}>
          <Pressable onPress={() => router.push('/map')} style={UI.quickBtn}>
            <Text style={UI.quickText}>マップ</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/shared')} style={UI.quickBtn}>
            <Text style={UI.quickText}>共同編集</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/reminders')} style={UI.quickBtn}>
            <Text style={UI.quickText}>アルバム</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Pressable
            onPress={() => router.push('/store/new')}
            style={{
              flex: 1,
              ...UI.primaryBtn,
            }}>
            <Text style={[UI.buttonText, { color: 'white' }]}>店舗を追加</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/reminders')}
            style={{
              paddingHorizontal: 12,
              ...UI.secondaryBtn,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={[UI.buttonText, { color: '#111827' }]}>⏰</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="店舗名で検索"
            style={{ flex: 1, ...UI.input, ...UI.bodyText }}
          />
          <Pressable
            onPress={() => setSortMode((m) => (m === 'created' ? 'name' : m === 'name' ? 'distance' : 'created'))}
            style={{
              paddingHorizontal: 12,
              ...UI.secondaryBtn,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={[UI.buttonText, { color: '#111827' }]}>
              {sortMode === 'created' ? '新着' : sortMode === 'name' ? '名前' : '距離'}
            </Text>
          </Pressable>
        </View>

        {content}

        <FlatList
          data={filteredSorted}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}
              style={UI.card}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[UI.titleText, { fontSize: 16 }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[UI.bodyText, { color: '#6B7280', marginTop: 2 }]}>
                    半径 200m / {item.enabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => deleteStore(item.id)}
                  style={UI.dangerBtn}>
                  <Text style={[UI.buttonText, { color: '#B91C1C' }]}>削除</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      </View>

      <BottomAdBanner />
    </View>
  );
}

