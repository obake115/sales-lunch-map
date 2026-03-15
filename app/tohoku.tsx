import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeImageBackground } from '@/src/ui/SafeImage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { t } from '@/src/i18n';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { getPrefecturePhotos } from '@/src/storage';
import { fonts } from '@/src/ui/fonts';
import { useThemeColors } from '@/src/state/ThemeContext';

const UI = {
  bg: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 } as const,
  overlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.2)' } as const,
  title: { fontSize: 18, fontFamily: fonts.extraBold, marginBottom: 10 } as const,
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 } as const,
  card: { width: '48%', borderWidth: 1, borderRadius: 14, overflow: 'hidden' } as const,
  photo: { width: '100%', height: 90 } as const,
  cardBody: { padding: 10 } as const,
  cardTitle: { fontFamily: fonts.extraBold } as const,
  hint: { marginBottom: 12 } as const,
} as const;

const TOHOKU_PREFS = [
  { id: 'aomori', key: 'prefectures.aomori' },
  { id: 'iwate', key: 'prefectures.iwate' },
  { id: 'miyagi', key: 'prefectures.miyagi' },
  { id: 'akita', key: 'prefectures.akita' },
  { id: 'yamagata', key: 'prefectures.yamagata' },
  { id: 'fukushima', key: 'prefectures.fukushima' },
];

export default function TohokuScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [photosByPref, setPhotosByPref] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const list = await getPrefecturePhotos();
    const next: Record<string, string> = {};
    for (const item of list) next[item.prefectureId] = item.photoUri;
    setPhotosByPref(next);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const cards = useMemo(
    () =>
      TOHOKU_PREFS.map((pref) => ({
        ...pref,
        photoUri: photosByPref[pref.id] ?? null,
      })),
    [photosByPref]
  );

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('@/assets/images/tohoku-highlight.png')}
        style={UI.bg}
        resizeMode="cover"
      />
      <View style={UI.overlay} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <Text style={[UI.title, { color: colors.text }]}>{t('regions.tohoku')}</Text>
        <Text style={[UI.hint, { color: colors.subText }]}>{t('regions.hint')}</Text>
        <View style={UI.grid}>
          {cards.map((pref) => (
            <Pressable
              key={pref.id}
              onPress={() => router.push({ pathname: '/collection/pref/[id]', params: { id: pref.id } })}
              style={[UI.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <SafeImageBackground
                uri={pref.photoUri}
                style={[UI.photo, { backgroundColor: colors.inputBg }]}
                resizeMode="cover"
              />
              <View style={UI.cardBody}>
                <Text style={[UI.cardTitle, { color: colors.text }]}>{t(pref.key)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomAdBanner />
    </View>
  );
}
