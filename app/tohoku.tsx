import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { t } from '@/src/i18n';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { getPrefecturePhotos } from '@/src/storage';

const UI = {
  bg: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  } as const,
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  } as const,
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  } as const,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  } as const,
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.95)',
  } as const,
  photo: {
    width: '100%',
    height: 90,
    backgroundColor: '#F3F4F6',
  } as const,
  cardBody: {
    padding: 10,
  } as const,
  cardTitle: {
    fontWeight: '800',
    color: '#111827',
  } as const,
  hint: {
    color: '#6B7280',
    marginBottom: 12,
  } as const,
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
        <Text style={UI.title}>{t('regions.tohoku')}</Text>
        <Text style={UI.hint}>{t('regions.hint')}</Text>
        <View style={UI.grid}>
          {cards.map((pref) => (
            <Pressable
              key={pref.id}
              onPress={() => router.push({ pathname: '/collection/pref/[id]', params: { id: pref.id } })}
              style={UI.card}>
              <ImageBackground
                source={pref.photoUri ? { uri: pref.photoUri } : undefined}
                style={UI.photo}
                resizeMode="cover"
              />
              <View style={UI.cardBody}>
                <Text style={UI.cardTitle}>{t(pref.key)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomAdBanner />
    </View>
  );
}
