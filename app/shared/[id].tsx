import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, Text, TextInput, View } from 'react-native';

import { searchPlaces, type PlaceSearchResult } from '@/src/places';
import { addMapStore, deleteMapStore, listenMap, listenMapStores, type SharedMap, type SharedStore } from '@/src/sharedMaps';
import { useAuth } from '@/src/state/AuthContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';

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
} as const;

async function openGoogleMaps(store: { name: string; latitude: number; longitude: number; placeId?: string }) {
  const query = store.placeId ? store.name : `${store.latitude},${store.longitude}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${
    store.placeId ? `&query_place_id=${encodeURIComponent(store.placeId)}` : ''
  }`;
  await Linking.openURL(url);
}

export default function SharedMapDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapId = id ?? '';
  const { user } = useAuth();

  const [map, setMap] = useState<SharedMap | null>(null);
  const [stores, setStores] = useState<SharedStore[]>([]);
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapId) return;
    const unsub = listenMap(mapId, setMap);
    return () => unsub();
  }, [mapId]);

  useEffect(() => {
    if (!mapId) return;
    const unsub = listenMapStores(mapId, setStores);
    return () => unsub();
  }, [mapId]);

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  const canSearch = placeQuery.trim().length > 0 && !placeSearching;
  const canSave = name.trim().length > 0 && latitude != null && longitude != null && !saving;

  const pickPlace = (result: PlaceSearchResult) => {
    setName(result.name);
    setPlaceId(result.placeId);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
  };

  const placeStatusText = useMemo(() => {
    if (placeSearching) return '検索中...';
    if (placeError) return placeError;
    if (placeResults.length === 0 && placeQuery.trim().length > 0) return '検索結果がありません。';
    return null;
  }, [placeSearching, placeError, placeResults.length, placeQuery]);

  if (!mapId) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: '#6B7280' }}>マップが見つかりません。</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>戻る</Text>
          </Pressable>
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
            {map?.name ?? '共同マップ'}
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 6 }}>招待コード: {map?.code ?? '-'}</Text>
          <Text style={{ color: '#6B7280', marginTop: 2 }}>参加者: {map?.memberIds?.length ?? 0}人</Text>
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>店舗を追加</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="店舗名"
            style={UI.input}
          />
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="メモ（任意）"
            style={{ marginTop: 8, ...UI.input }}
          />

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: '800', marginBottom: 6 }}>Googleで検索</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholder="例：新宿 ランチ"
                style={{ flex: 1, ...UI.input }}
              />
              <Pressable
                disabled={!canSearch}
                onPress={async () => {
                  if (!canSearch) return;
                  try {
                    setPlaceSearching(true);
                    setPlaceError(null);
                    const results = await searchPlaces(placeQuery, deviceLatLng ? { location: deviceLatLng } : undefined);
                    setPlaceResults(results);
                  } catch (e: any) {
                    setPlaceResults([]);
                    setPlaceError(e?.message ?? '検索に失敗しました。');
                  } finally {
                    setPlaceSearching(false);
                  }
                }}
                style={{
                  ...UI.secondaryBtn,
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                  backgroundColor: canSearch ? UI.secondaryBtn.backgroundColor : '#F3F4F6',
                  borderColor: canSearch ? UI.secondaryBtn.borderColor : '#E5E7EB',
                }}>
                <Text style={{ color: canSearch ? '#111827' : '#6B7280', fontWeight: '800' }}>検索</Text>
              </Pressable>
            </View>
            {!!placeStatusText && (
              <Text style={{ color: placeError ? '#DC2626' : '#6B7280', marginTop: 8 }}>{placeStatusText}</Text>
            )}
            <View style={{ marginTop: 10, gap: 8 }}>
              {placeResults.map((r) => (
                <Pressable
                  key={r.placeId}
                  onPress={() => pickPlace(r)}
                  style={{
                    borderWidth: 1,
                    borderColor: '#E7E2D5',
                    borderRadius: 12,
                    padding: 10,
                    backgroundColor: '#FFFFFF',
                  }}>
                  <Text style={{ fontWeight: '800' }} numberOfLines={1}>
                    {r.name}
                  </Text>
                  {!!r.address && (
                    <Text style={{ color: '#6B7280', marginTop: 4 }} numberOfLines={2}>
                      {r.address}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: '800', marginBottom: 6 }}>位置情報</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={async () => {
                  const fg = await Location.requestForegroundPermissionsAsync();
                  if (!fg.granted) {
                    Alert.alert('位置情報が必要です', '現在地取得のため、位置情報を許可してください。');
                    return;
                  }
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                  setLatitude(pos.coords.latitude);
                  setLongitude(pos.coords.longitude);
                  setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                }}
                style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
                <Text style={{ fontWeight: '800', color: '#111827' }}>現在地を取得</Text>
              </Pressable>
            </View>
            <Text style={{ color: '#6B7280', marginTop: 6 }}>
              緯度: {latitude ?? '-'} / 経度: {longitude ?? '-'}
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ color: '#6B7280' }}>Place ID: {placeId || '-'}</Text>
          </View>

          <Pressable
            disabled={!canSave}
            onPress={async () => {
              if (!user) return;
              if (!canSave) return;
              try {
                setSaving(true);
                await addMapStore(mapId, {
                  name,
                  memo,
                  placeId: placeId.trim().length > 0 ? placeId.trim() : undefined,
                  latitude: latitude as number,
                  longitude: longitude as number,
                  createdBy: user.uid,
                });
                setName('');
                setMemo('');
                setPlaceId('');
                setPlaceQuery('');
                setPlaceResults([]);
                setLatitude(null);
                setLongitude(null);
              } catch (e: any) {
                Alert.alert('保存できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
              } finally {
                setSaving(false);
              }
            }}
            style={{
              marginTop: 10,
              ...UI.primaryBtn,
              backgroundColor: canSave ? UI.primaryBtn.backgroundColor : '#9BB8FF',
            }}>
            <Text style={{ color: 'white', fontWeight: '900' }}>{saving ? '保存中...' : '保存'}</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ fontWeight: '900' }}>店舗一覧</Text>
          {stores.length === 0 && <Text style={{ color: '#6B7280' }}>まだ店舗がありません。</Text>}
          <FlatList
            data={stores}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              const canDelete = user?.uid && user.uid === item.createdBy;
              return (
                <View style={UI.card}>
                  <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {!!item.memo && (
                    <Text style={{ color: '#6B7280', marginTop: 4 }} numberOfLines={2}>
                      メモ: {item.memo}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable
                      onPress={() => openGoogleMaps(item)}
                      style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 10 }}>
                      <Text style={{ fontWeight: '800', color: '#111827' }}>Googleマップ</Text>
                    </Pressable>
                    {canDelete && (
                      <Pressable
                        onPress={async () => {
                          try {
                            await deleteMapStore(mapId, item.id);
                          } catch (e: any) {
                            Alert.alert('削除できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                          }
                        }}
                        style={UI.dangerBtn}>
                        <Text style={{ color: '#B91C1C', fontWeight: '800' }}>削除</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      </View>

      <BottomAdBanner />
    </View>
  );
}
