import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, Text, View } from 'react-native';

import { useStores } from '@/src/state/StoresContext';
import { getProfileAvatarUri } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { PermissionNotice } from '@/src/ui/PermissionNotice';

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
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  } as const,
  quickBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
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
  quickIcon: {
    fontSize: 28,
    marginBottom: 6,
  } as const,
  quickImage: {
    width: '100%',
    height: '100%',
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
  const { loading, stores, updateStore, deleteStore } = useStores();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'created' | 'name' | 'distance'>('created');
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (sortMode !== 'distance') return;
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, [sortMode]);

  const handlePickStorePhoto = async (storeId: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('写真へのアクセスが必要です', '店舗の写真を追加するために許可してください。');
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
    let mounted = true;
    (async () => {
      const uri = await getProfileAvatarUri();
      if (mounted) setAvatarUri(uri);
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
          <Text style={UI.headerTitle}>ランチマップ</Text>
          <Pressable onPress={() => router.push('/profile')} style={UI.profileBtn}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={UI.profileImage} />
            ) : (
              <Text style={[UI.buttonText, { color: '#111827' }]}>👤</Text>
            )}
          </Pressable>
        </View>

        <View style={UI.quickRow}>
          <Pressable onPress={() => router.push('/map')} style={UI.quickBtn}>
            <Image
              source={require('@/assets/images/quick-map.png')}
              style={UI.quickImage}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/shared')} style={UI.quickBtn}>
            <Image
              source={require('@/assets/images/quick-shared.png')}
              style={UI.quickImage}
              resizeMode="cover"
            />
          </Pressable>
          <Pressable onPress={() => router.push('/reminders')} style={UI.quickBtn}>
            <Image
              source={require('@/assets/images/quick-album.png')}
              style={UI.quickImage}
              resizeMode="cover"
            />
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

        <View style={{ marginBottom: 12 }}>
          <Text style={UI.headerTitle}>あなたのマップ</Text>
        </View>

        <Pressable onPress={() => router.push('/list')} style={UI.listBtn}>
          <Text style={UI.listBtnText}>リストを表示</Text>
        </Pressable>

        {content}

        <FlatList
          data={filteredSorted}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}
              style={UI.card}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Pressable onPress={() => handlePickStorePhoto(item.id)}>
                  {item.photoUri ? (
                    <Image source={{ uri: item.photoUri }} style={UI.storeImage} />
                  ) : (
                    <View style={[UI.storeImage, UI.storeImagePlaceholder]}>
                      <Text style={UI.storeImageText}>写真追加</Text>
                    </View>
                  )}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={[UI.titleText, { fontSize: 16 }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    <Text style={[UI.bodyText, { color: '#6B7280', marginTop: 2 }]}>半径 200m</Text>
                    {(item.moodTags?.length || item.sceneTags?.length) ? (
                      <View style={UI.tagRow}>
                        {[...(item.moodTags ?? []), ...(item.sceneTags ?? [])].map((tag) => (
                          <View key={tag} style={UI.tagChip}>
                            <Text style={UI.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    </View>
                    <Pressable onPress={() => deleteStore(item.id)} style={UI.dangerBtn}>
                      <Text style={[UI.buttonText, { color: '#B91C1C' }]}>削除</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>

      <BottomAdBanner />
    </View>
  );
}

