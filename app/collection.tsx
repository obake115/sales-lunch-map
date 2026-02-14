import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { t } from '@/src/i18n';
import { getTravelLunchEntries } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { JapanMapStage } from '@/components/collection/JapanMapStage';
import { JapanMapOverlay } from '@/components/collection/JapanMapOverlay';
import type { TravelLunchEntry } from '@/src/models';

const MAP_SOURCE = require('@/assets/maps/japan_beige.png');

const PREF_MARKERS: { id: string; x: number; y: number }[] = [
  { id: 'hokkaido', x: 0.55, y: 0.45 },
  { id: 'aomori', x: 0.5, y: 0.1 },
  { id: 'akita', x: 0.25, y: 0.35 },
  { id: 'iwate', x: 0.7, y: 0.35 },
  { id: 'yamagata', x: 0.35, y: 0.6 },
  { id: 'miyagi', x: 0.65, y: 0.6 },
  { id: 'fukushima', x: 0.5, y: 0.85 },
  { id: 'gunma', x: 0.35, y: 0.25 },
  { id: 'tochigi', x: 0.55, y: 0.25 },
  { id: 'ibaraki', x: 0.75, y: 0.35 },
  { id: 'saitama', x: 0.45, y: 0.45 },
  { id: 'tokyo', x: 0.55, y: 0.6 },
  { id: 'chiba', x: 0.75, y: 0.6 },
  { id: 'kanagawa', x: 0.5, y: 0.8 },
  { id: 'niigata', x: 0.7, y: 0.2 },
  { id: 'toyama', x: 0.55, y: 0.25 },
  { id: 'ishikawa', x: 0.4, y: 0.25 },
  { id: 'fukui', x: 0.3, y: 0.45 },
  { id: 'nagano', x: 0.65, y: 0.45 },
  { id: 'yamanashi', x: 0.75, y: 0.6 },
  { id: 'gifu', x: 0.45, y: 0.6 },
  { id: 'aichi', x: 0.4, y: 0.8 },
  { id: 'shizuoka', x: 0.75, y: 0.8 },
  { id: 'kyoto', x: 0.5, y: 0.2 },
  { id: 'shiga', x: 0.55, y: 0.35 },
  { id: 'hyogo', x: 0.25, y: 0.35 },
  { id: 'osaka', x: 0.45, y: 0.45 },
  { id: 'nara', x: 0.6, y: 0.55 },
  { id: 'mie', x: 0.65, y: 0.75 },
  { id: 'wakayama', x: 0.45, y: 0.85 },
  { id: 'shimane', x: 0.35, y: 0.35 },
  { id: 'tottori', x: 0.7, y: 0.35 },
  { id: 'hiroshima', x: 0.4, y: 0.65 },
  { id: 'okayama', x: 0.7, y: 0.65 },
  { id: 'yamaguchi', x: 0.1, y: 0.55 },
  { id: 'kagawa', x: 0.6, y: 0.25 },
  { id: 'tokushima', x: 0.75, y: 0.4 },
  { id: 'ehime', x: 0.3, y: 0.5 },
  { id: 'kochi', x: 0.55, y: 0.75 },
  { id: 'fukuoka', x: 0.35, y: 0.2 },
  { id: 'saga', x: 0.25, y: 0.35 },
  { id: 'nagasaki', x: 0.1, y: 0.4 },
  { id: 'oita', x: 0.6, y: 0.4 },
  { id: 'kumamoto', x: 0.3, y: 0.55 },
  { id: 'miyazaki', x: 0.7, y: 0.65 },
  { id: 'kagoshima', x: 0.45, y: 0.85 },
  { id: 'okinawa', x: 0.85, y: 0.95 },
];

const UI = {
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  } as const,
  hint: {
    color: '#6B7280',
    marginBottom: 12,
  } as const,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  } as const,
  backText: {
    color: '#111827',
    fontWeight: '700',
  } as const,
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  } as const,
  headerSpacer: {
    width: 56,
  } as const,
  mapWrap: {
    marginTop: 8,
    marginBottom: 12,
    marginHorizontal: -16,
    alignItems: 'center',
  } as const,
  selectedChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  } as const,
  selectedChipText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 12,
  } as const,
  cardAreaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  } as const,
  cardAreaTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  } as const,
  shuffleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  } as const,
  shuffleText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  } as const,
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  } as const,
  card: {
    width: 220,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  } as const,
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  } as const,
  cardBody: {
    padding: 10,
  } as const,
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  } as const,
  cardMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  } as const,
  cardMemo: {
    fontSize: 12,
    color: '#6B7280',
  } as const,
  emptyCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  } as const,
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  } as const,
  emptyBody: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  } as const,
  emptyBtn: {
    marginTop: 10,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  } as const,
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  } as const,
  mapOverlayWrap: {
    width: '100%',
    height: '100%',
  } as const,
} as const;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [posts, setPosts] = useState<TravelLunchEntry[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
  const [randomPosts, setRandomPosts] = useState<TravelLunchEntry[]>([]);

  const mapSize = useMemo(() => {
    const resolved = Image.resolveAssetSource(MAP_SOURCE);
    const ratio =
      resolved?.width && resolved?.height ? resolved.width / resolved.height : 1.4;
    const width = Math.max(0, screenWidth);
    const height = Math.min(520, width, width / ratio);
    return { width, height, ratio };
  }, [screenWidth]);

  const visitedPrefectures = useMemo(() => {
    return new Set(posts.map((p) => p.prefectureId));
  }, [posts]);

  const refresh = useCallback(async () => {
    const list = await getTravelLunchEntries();
    setPosts(list);
    setRandomPosts(pickRandomPosts(list, 5));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const visiblePosts = useMemo(() => {
    if (!selectedPrefecture) return randomPosts;
    return posts.filter((p) => p.prefectureId === selectedPrefecture);
  }, [posts, randomPosts, selectedPrefecture]);

  const selectedName = selectedPrefecture ? t(`prefectures.${selectedPrefecture}`) : null;

  const handleMapPress = useCallback(
    (payload: { x: number; y: number; width: number; height: number }) => {
      const normX = payload.x / payload.width;
      const normY = payload.y / payload.height;
      let min = Number.POSITIVE_INFINITY;
      let chosen: string | null = null;
      for (const marker of PREF_MARKERS) {
        const dx = marker.x - normX;
        const dy = marker.y - normY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < min) {
          min = dist;
          chosen = marker.id;
        }
      }
      if (!chosen) return;
      setSelectedPrefecture((prev) => (prev === chosen ? null : chosen));
    },
    []
  );

  const shuffle = useCallback(() => {
    setRandomPosts(pickRandomPosts(posts, 5));
  }, [posts]);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <View style={UI.header}>
          <Pressable onPress={() => router.back()} style={{ width: 56 }}>
            <Text style={UI.backText}>＜ {t('nav.home')}</Text>
          </Pressable>
          <Text style={UI.headerTitle}>{t('collection.title')}</Text>
          <View style={UI.headerSpacer} />
        </View>
        <Text style={UI.title}>{t('collection.title')}</Text>
        <Text style={UI.hint}>{t('collection.hint')}</Text>

        <View style={UI.mapWrap}>
          <JapanMapStage width={mapSize.width} height={mapSize.height} onPress={handleMapPress}>
            <View style={UI.mapOverlayWrap}>
              <JapanMapOverlay
                width={mapSize.width}
                height={mapSize.height}
                visitedPrefectures={visitedPrefectures}
                selectedPrefecture={selectedPrefecture}
              />
            </View>
          </JapanMapStage>
        </View>

        {selectedName ? (
          <Pressable style={UI.selectedChip} onPress={() => setSelectedPrefecture(null)}>
            <Text style={UI.selectedChipText}>{t('collection.clearFilter', { name: selectedName })}</Text>
          </Pressable>
        ) : null}

        <View style={UI.cardAreaHeader}>
          <Text style={UI.cardAreaTitle}>
            {selectedName
              ? t('collection.cardTitleSelected', { name: selectedName })
              : t('collection.cardTitleAll')}
          </Text>
          {!selectedPrefecture ? (
            <Pressable style={UI.shuffleBtn} onPress={shuffle}>
              <Text style={UI.shuffleText}>🎲 {t('collection.shuffle')}</Text>
            </Pressable>
          ) : null}
        </View>

        {selectedPrefecture && visiblePosts.length === 0 ? (
          <View style={UI.emptyCard}>
            <Text style={UI.emptyTitle}>{t('travel.prefDetailEmpty')}</Text>
            <Text style={UI.emptyBody}>{t('collection.emptyBody')}</Text>
            <Pressable
              style={UI.emptyBtn}
              onPress={() => router.push(`/travel/new?prefecture=${selectedPrefecture}`)}
            >
              <Text style={UI.emptyBtnText}>{t('home.addStore')}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={UI.cardRow}>
              {visiblePosts.map((post) => (
                <Pressable
                  key={post.id}
                  style={UI.card}
                  onPress={() => router.push(`/travel/pref/${post.prefectureId}`)}
                >
                  <Image source={{ uri: post.imageUri }} style={UI.cardImage} />
                  <View style={UI.cardBody}>
                    <Text style={UI.cardTitle} numberOfLines={1}>
                      {post.restaurantName}
                    </Text>
                    <Text style={UI.cardMeta} numberOfLines={1}>
                      {post.genre} | {post.visitedAt}
                    </Text>
                    {post.memo ? (
                      <Text style={UI.cardMemo} numberOfLines={1}>
                        {post.memo}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>
      <BottomAdBanner />
    </SafeAreaView>
  );
}

function pickRandomPosts(posts: TravelLunchEntry[], count: number) {
  if (posts.length <= count) return posts.slice();
  const pool = posts.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
