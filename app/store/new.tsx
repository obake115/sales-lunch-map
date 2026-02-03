import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { useStores } from '@/src/state/StoresContext';

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
} as const;

function toRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

export default function StoreNewScreen() {
  const router = useRouter();
  const { addStore } = useStores();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = latitude != null && longitude != null && !saving;

  const region: Region | null =
    latitude != null && longitude != null ? toRegion(latitude, longitude) : null;

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    })();
  }, []);

  const displayName = useMemo(() => (name.trim().length > 0 ? name.trim() : '名称未設定'), [name]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>ランチ候補名（任意）</Text>
          <TextInput value={name} onChangeText={setName} placeholder="例：現場前の定食屋" style={UI.input} />
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>メモ（任意）</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="例：日替わりが早い。13時以降は空いてる"
            style={UI.input}
            multiline
          />
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 6 }}>位置を選択</Text>
          <Text style={{ color: '#6B7280', marginBottom: 10 }}>地図をタップしてピンを置いてください。</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#E7E2D5',
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: 'white',
              height: 240,
            }}>
            {region ? (
              <MapView
                style={{ flex: 1 }}
                region={region}
                onRegionChangeComplete={(next) => {
                  setLatitude(next.latitude);
                  setLongitude(next.longitude);
                }}
                onPress={(e) => {
                  const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                showsUserLocation>
                {latitude != null && longitude != null && (
                  <Marker
                    coordinate={{ latitude, longitude }}
                    title={displayName}
                    draggable
                    onDragEnd={(e) => {
                      setLatitude(e.nativeEvent.coordinate.latitude);
                      setLongitude(e.nativeEvent.coordinate.longitude);
                    }}
                  />
                )}
              </MapView>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#6B7280' }}>位置情報を取得中…</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          disabled={!canSave}
          onPress={async () => {
            if (!canSave) return;
            try {
              setSaving(true);
              await addStore({
                name: name.trim() || '名称未設定',
                latitude: latitude as number,
                longitude: longitude as number,
                note: note.trim() || undefined,
              });
              router.back();
            } catch (e: any) {
              Alert.alert('保存に失敗しました', e?.message ?? 'もう一度お試しください。');
            } finally {
              setSaving(false);
            }
          }}
          style={{
            ...UI.primaryBtn,
            backgroundColor: canSave ? UI.primaryBtn.backgroundColor : '#E5E7EB',
          }}>
          <Text style={{ color: canSave ? 'white' : '#6B7280', fontWeight: '900' }}>候補を登録</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
