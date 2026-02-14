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
} from 'react-native';

import { t } from '@/src/i18n';
import { getTravelLunchEntries } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { JapanMapInteractive } from '@/src/ui/JapanMapInteractive';
import type { TravelLunchEntry } from '@/src/models';

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
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  } as const,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EC4899',
  } as const,
  chipText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  } as const,
  chipClose: {
    marginLeft: 4,
    color: '#FFFFFF',
    fontWeight: '700',
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
} as const;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<TravelLunchEntry[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);

  const visitedPrefectures = useMemo(() => {
    return new Set(posts.map((p) => p.prefectureId));
  }, [posts]);

  // Sort by createdAt desc, then filter by selected prefecture
  const visiblePosts = useMemo(() => {
    const sorted = posts.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (!selectedPrefecture) return sorted;
    return sorted.filter((p) => p.prefectureId === selectedPrefecture);
  }, [posts, selectedPrefecture]);

  const refresh = useCallback(async () => {
    const list = await getTravelLunchEntries();
    setPosts(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const selectedName = selectedPrefecture ? t(`prefectures.${selectedPrefecture}`) : null;

  const handleMapSelect = useCallback(
    (prefId: string) => {
      setSelectedPrefecture((prev) => (prev === prefId ? null : prefId));
    },
    []
  );

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
          <JapanMapInteractive
            onSelect={handleMapSelect}
            selectedPref={selectedPrefecture}
            visitedPrefs={visitedPrefectures}
          />
        </View>

        {selectedPrefecture ? (
          <View style={UI.chipRow}>
            <Pressable
              style={UI.chip}
              onPress={() => setSelectedPrefecture(null)}
            >
              <Text style={UI.chipText}>{selectedName}</Text>
              <Text style={UI.chipClose}> ✕</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={UI.cardAreaHeader}>
          <Text style={UI.cardAreaTitle}>
            {selectedName
              ? t('collection.cardTitleSelected', { name: selectedName })
              : t('collection.cardTitleRecent')}
          </Text>
        </View>

        {visiblePosts.length === 0 ? (
          <View style={UI.emptyCard}>
            <Text style={UI.emptyTitle}>{t('travel.prefDetailEmpty')}</Text>
            <Text style={UI.emptyBody}>{t('collection.emptyBody')}</Text>
            {selectedPrefecture ? (
              <Pressable
                style={UI.emptyBtn}
                onPress={() => router.push(`/travel/new?prefecture=${selectedPrefecture}`)}
              >
                <Text style={UI.emptyBtnText}>{t('home.addStore')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={UI.cardRow}>
              {visiblePosts.map((post) => {
                const prefName = t(`prefectures.${post.prefectureId}`);
                return (
                  <Pressable
                    key={post.id}
                    style={UI.card}
                    onPress={() => router.push(`/travel/pref/${post.prefectureId}`)}
                  >
                    <Image source={{ uri: post.imageUri }} style={UI.cardImage} />
                    <View style={UI.cardBody}>
                      <Text style={UI.cardTitle} numberOfLines={1}>
                        {prefName}｜{post.restaurantName}
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
                );
              })}
            </View>
          </ScrollView>
        )}
      </ScrollView>
      <BottomAdBanner />
    </SafeAreaView>
  );
}
