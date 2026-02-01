import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
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
  secondaryBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  } as const,
} as const;

export default function StoreNewScreen() {
  const router = useRouter();
  const { addStore } = useStores();

  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);

  const canSave = name.trim().length > 0 && latitude != null && longitude != null && !saving;

  const region: Region | null =
    latitude != null && longitude != null
      ? {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : null;

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    let posSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;

    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;

      // Track location for "current location arrow" marker.
      posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 2, timeInterval: 2000 },
        (p) => setDeviceLatLng({ latitude: p.coords.latitude, longitude: p.coords.longitude })
      );

      // Track heading (device orientation). Some devices may not provide heading; keep last known value.
      headingSub = await Location.watchHeadingAsync((h) => {
        const next = Number.isFinite(h.trueHeading) && h.trueHeading > 0 ? h.trueHeading : h.magHeading;
        if (Number.isFinite(next)) setDeviceHeading(next);
      });
    })();

    return () => {
      posSub?.remove();
      headingSub?.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={UI.card}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>店舗名</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="例：業務スーパー"
          style={UI.input}
        />
      </View>

      <View style={UI.card}>
        <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 6 }}>場所</Text>
        <Text style={{ color: '#6B7280', marginBottom: 10 }}>
          地図をタップするか、ピンをドラッグして場所を決めてください。
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#E7E2D5',
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: 'white',
            height: 220,
          }}>
          {region ? (
            <MapView
              style={{ flex: 1 }}
              region={region}
              showsUserLocation={false}
              showsMyLocationButton
              onPress={(e) => {
                const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                setLatitude(lat);
                setLongitude(lng);
              }}>
              {!!deviceLatLng && (
                <Marker coordinate={deviceLatLng} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                    {/* "light" cone (gradient-like by layering) */}
                    <View
                      style={{
                        position: 'absolute',
                        width: 140,
                        height: 140,
                        transform: [{ rotate: `${deviceHeading}deg` }],
                      }}>
                      {(
                        [
                          { w: 92, h: 120, a: 0.05 },
                          { w: 74, h: 112, a: 0.08 },
                          { w: 58, h: 104, a: 0.11 },
                          { w: 44, h: 96, a: 0.15 },
                          { w: 32, h: 88, a: 0.20 },
                        ] as const
                      ).map((layer, idx) => (
                        <View
                          // eslint-disable-next-line react/no-array-index-key
                          key={idx}
                          style={{
                            position: 'absolute',
                            left: 70,
                            top: 70 - layer.h,
                            width: 0,
                            height: 0,
                            borderLeftWidth: layer.w / 2,
                            borderRightWidth: layer.w / 2,
                            borderBottomWidth: layer.h,
                            borderLeftColor: 'transparent',
                            borderRightColor: 'transparent',
                            borderBottomColor: `rgba(59, 130, 246, ${layer.a})`,
                          }}
                        />
                      ))}
                    </View>

                    {/* blue dot (Google Maps-like) */}
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        backgroundColor: '#2563EB',
                        borderWidth: 3,
                        borderColor: 'white',
                        shadowColor: '#000',
                        shadowOpacity: 0.18,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                      }}
                    />
                  </View>
                </Marker>
              )}
              <Marker
                coordinate={{ latitude: region.latitude, longitude: region.longitude }}
                draggable
                onDragEnd={(e) => {
                  const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#6B7280' }}>位置情報を取得中…</Text>
            </View>
          )}
        </View>

        <Text style={{ fontWeight: '800', marginTop: 10 }}>緯度・経度</Text>
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
          }}
          style={UI.secondaryBtn}>
          <Text style={{ color: 'white', fontWeight: '800' }}>現在地を取得</Text>
        </Pressable>

        <View
          style={{
            borderWidth: 1,
            borderColor: '#E7E2D5',
            borderRadius: 14,
            padding: 12,
            backgroundColor: '#FFFFFF',
            gap: 6,
            marginTop: 10,
          }}>
          <Text style={{ color: '#6B7280' }}>緯度: {latitude ?? '-'}</Text>
          <Text style={{ color: '#6B7280' }}>経度: {longitude ?? '-'}</Text>
          <Text style={{ color: '#6B7280' }}>ジオフェンス半径: 200m（固定）</Text>
        </View>
      </View>

      <Pressable
        disabled={!canSave}
        onPress={async () => {
          if (!canSave) return;
          try {
            setSaving(true);
            const created = await addStore({
              name,
              latitude: latitude as number,
              longitude: longitude as number,
            });
            router.replace({ pathname: '/store/[id]', params: { id: created.id } });
          } finally {
            setSaving(false);
          }
        }}
        style={{
          marginTop: 2,
          ...UI.primaryBtn,
          backgroundColor: canSave ? UI.primaryBtn.backgroundColor : '#9BB8FF',
          opacity: canSave ? 1 : 0.7,
        }}>
        <Text style={{ color: 'white', fontWeight: '900' }}>{saving ? '保存中...' : '保存'}</Text>
      </Pressable>
    </View>
  );
}

