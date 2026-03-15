import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { SafeImage } from '@/src/ui/SafeImage';
import { getPrefecturePhotos, setPrefecturePhoto } from '@/src/storage';

const UI = {
  title: {
    fontSize: 18,
    fontFamily: fonts.extraBold,
    marginBottom: 12,
  } as const,
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 16,
  } as const,
  btn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  } as const,
  btnText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
  } as const,
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 14,
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
  const colors = useThemeColors();
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
      mediaTypes: ['images'],
      allowsEditing: true,
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
      <Text style={[UI.title, { color: colors.text }]}>{PREF_KEYS[prefId] ? t(PREF_KEYS[prefId]) : t('pref.fallback')}</Text>
      {photoUri ? (
        <SafeImage uri={photoUri} style={[UI.photo, { backgroundColor: colors.inputBg }]} />
      ) : (
        <View style={[UI.photo, { backgroundColor: colors.inputBg }]} />
      )}
      <Pressable onPress={handlePick} style={[UI.btn, { backgroundColor: colors.accent }]}>
        <Text style={UI.btnText}>{t('pref.addPhoto')}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push(`/travel/new?prefecture=${prefId}`)}
        style={[UI.secondaryBtn, { backgroundColor: colors.primary }]}>
        <Text style={UI.btnText}>{t('pref.addTravel')}</Text>
      </Pressable>
    </View>
  );
}
