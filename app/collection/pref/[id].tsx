import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { t } from '@/src/i18n';
import { getPrefecturePhotos, setPrefecturePhoto } from '@/src/storage';

const UI = {
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  } as const,
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  } as const,
  btn: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    alignItems: 'center',
  } as const,
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  } as const,
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#2E5CE6',
    paddingVertical: 10,
    alignItems: 'center',
  } as const,
} as const;

const PREF_KEYS: Record<string, string> = {
  fukuoka: 'prefectures.fukuoka',
  saga: 'prefectures.saga',
  nagasaki: 'prefectures.nagasaki',
  kumamoto: 'prefectures.kumamoto',
  oita: 'prefectures.oita',
  miyazaki: 'prefectures.miyazaki',
  kagoshima: 'prefectures.kagoshima',
  okinawa: 'prefectures.okinawa',
};

export default function PrefectureDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const prefId = id ?? '';
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await getPrefecturePhotos();
    const hit = list.find((p) => p.prefectureId === prefId);
    setPhotoUri(hit?.photoUri ?? null);
  }, [prefId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handlePick = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('pref.photoPermissionTitle'), t('pref.photoPermissionBody'));
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
    await setPrefecturePhoto(prefId, uri);
    await refresh();
  }, [prefId, refresh]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={UI.title}>{PREF_KEYS[prefId] ? t(PREF_KEYS[prefId]) : t('pref.fallback')}</Text>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={UI.photo} />
      ) : (
        <View style={UI.photo} />
      )}
      <Pressable onPress={handlePick} style={UI.btn}>
        <Text style={UI.btnText}>{t('pref.addPhoto')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push(`/travel/new?prefecture=${prefId}`)}
        style={UI.secondaryBtn}>
        <Text style={UI.btnText}>{t('pref.addTravel')}</Text>
      </Pressable>
    </View>
  );
}
