import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { t } from '@/src/i18n';
import { fonts } from '@/src/ui/fonts';
import { useThemeColors } from '@/src/state/ThemeContext';
import { deleteTravelLunchEntry, getTravelLunchEntries, updateTravelLunchEntryImage } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { JapanMapInteractive } from '@/src/ui/JapanMapInteractive';
import { NeuCard } from '@/src/ui/NeuCard';
import type { TravelLunchEntry } from '@/src/models';

// ─── Map colors ─────────────────────────────────────
const UNVISITED_FILL = '#F3EFE8';
const VISITED_FILL = '#E78FB3';
const SELECTED_FILL = '#EC4899';
const MAP_STROKE = '#D5D0C6';

const UI = {
  title: { fontSize: 18, fontFamily: fonts.extraBold, color: '#111827', marginBottom: 12 } as const,
  hint: { color: '#6B7280', marginBottom: 12 } as const,
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 } as const,
  backText: { color: '#111827', fontFamily: fonts.bold } as const,
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: fonts.bold, color: '#111827' } as const,
  headerSpacer: { width: 36 } as const,
  mapWrap: { marginTop: 8, marginBottom: 12, marginHorizontal: -16, alignItems: 'center' } as const,
  legend: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: -4, marginRight: 8, marginBottom: 4 } as const,
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: VISITED_FILL } as const,
  legendText: { fontSize: 11, fontFamily: fonts.medium } as const,
  toastWrap: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center', zIndex: 10 } as const,
  toast: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const,
  toastText: { color: '#1F2A37', fontSize: 13, fontFamily: fonts.bold } as const,
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 } as const,
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: SELECTED_FILL } as const,
  chipText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 } as const,
  chipClose: { marginLeft: 4, color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 } as const,
  cardAreaHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 } as const,
  cardAreaTitle: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: '#111827' } as const,
  cardRow: { flexDirection: 'row', gap: 12 } as const,
  card: { width: 220, borderRadius: 20, backgroundColor: '#E9E4DA', overflow: 'hidden' } as const,
  cardImage: { width: '100%', height: 140, backgroundColor: '#D5D0C6' } as const,
  cardBody: { padding: 10 } as const,
  cardTitle: { fontSize: 14, fontFamily: fonts.bold, color: '#111827', marginBottom: 4 } as const,
  cardMeta: { fontSize: 12, color: '#6B7280', marginBottom: 4 } as const,
  cardMemo: { fontSize: 12, color: '#6B7280' } as const,
  emptyCard: { borderRadius: 20, backgroundColor: '#E9E4DA', padding: 16 } as const,
  emptyTitle: { fontSize: 14, fontFamily: fonts.bold, color: '#111827' } as const,
  emptyBody: { marginTop: 6, fontSize: 12, color: '#6B7280' } as const,
  emptyBtn: { marginTop: 10, backgroundColor: '#4F78FF', paddingVertical: 10, borderRadius: 28, alignItems: 'center' } as const,
  emptyBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 } as const,
} as const;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [posts, setPosts] = useState<TravelLunchEntry[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ name: string; count: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Derived data ──
  const visitedPrefectures = useMemo(() => new Set(posts.map((p) => p.prefectureId)), [posts]);

  const prefCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    posts.forEach((p) => {
      map[p.prefectureId] = (map[p.prefectureId] || 0) + 1;
    });
    return map;
  }, [posts]);

  // Only prefs with 3+ posts breathe
  const breathingPrefs = useMemo(() => {
    const set = new Set<string>();
    for (const [id, count] of Object.entries(prefCountMap)) {
      if (count >= 3) set.add(id);
    }
    return set;
  }, [prefCountMap]);

  const visiblePosts = useMemo(() => {
    const sorted = posts.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (!selectedPrefecture) return sorted;
    return sorted.filter((p) => p.prefectureId === selectedPrefecture);
  }, [posts, selectedPrefecture]);

  const refresh = useCallback(async () => {
    const list = await getTravelLunchEntries();
    setPosts(list);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Cleanup toast timer
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const selectedName = selectedPrefecture ? t(`prefectures.${selectedPrefecture}`) : null;

  const clearSelection = useCallback(() => {
    setSelectedPrefecture(null);
    setToastInfo(null);
  }, []);

  const handleMapSelect = useCallback((prefId: string) => {
    const count = prefCountMap[prefId] || 0;
    if (count === 0) {
      // No records — clear selection, no toast
      clearSelection();
      return;
    }
    // Toggle selection + show toast
    setSelectedPrefecture((prev) => (prev === prefId ? null : prefId));
    setToastInfo({ name: t(`prefectures.${prefId}`), count });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastInfo(null), 1500);
  }, [prefCountMap, clearSelection]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <View style={UI.header}>
          <Pressable onPress={() => router.back()} style={{ width: 36 }}>
            <Text style={[UI.backText, { color: colors.text, fontSize: 20 }]}>＜</Text>
          </Pressable>
          <Text style={[UI.headerTitle, { color: colors.text }]}>{t('collection.title')}</Text>
          <View style={UI.headerSpacer} />
        </View>
        <Text style={[UI.title, { color: colors.text }]}>{t('collection.title')}</Text>
        <Text style={[UI.hint, { color: colors.subText }]}>{t('collection.hint')}</Text>
        <View style={UI.mapWrap}>
          <JapanMapInteractive
            onSelect={handleMapSelect}
            onBackgroundPress={clearSelection}
            selectedPref={selectedPrefecture}
            visitedPrefs={visitedPrefectures}
            fillDefault={UNVISITED_FILL}
            fillVisited={VISITED_FILL}
            fillSelected={SELECTED_FILL}
            stroke={MAP_STROKE}
            breathing
            breathingPrefs={breathingPrefs}
          />
          {/* Toast pill */}
          {toastInfo && (
            <View style={UI.toastWrap} pointerEvents="none">
              <View style={[UI.toast, { backgroundColor: colors.card }]}>
                <Text style={[UI.toastText, { color: colors.text }]}>
                  {toastInfo.name} / {t('collection.memoryCount', { count: toastInfo.count })}
                  {toastInfo.count >= 5 ? '  🌸' : ''}
                </Text>
              </View>
            </View>
          )}
          {visitedPrefectures.size > 0 && (
            <View style={UI.legend}>
              <View style={UI.legendDot} />
              <Text style={[UI.legendText, { color: colors.subText }]}>{t('collection.legendVisited')}</Text>
            </View>
          )}
        </View>
        {selectedPrefecture ? (
          <View style={UI.chipRow}>
            <Pressable style={UI.chip} onPress={() => setSelectedPrefecture(null)}>
              <Text style={UI.chipText}>{selectedName}</Text>
              <Text style={UI.chipClose}> ✕</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={UI.cardAreaHeader}>
          <Text style={[UI.cardAreaTitle, { color: colors.text }]}>
            {selectedName ? t('collection.cardTitleSelected', { name: selectedName }) : t('collection.cardTitleRecent')}
          </Text>
        </View>
        {visiblePosts.length === 0 ? (
          <NeuCard style={[UI.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={[UI.emptyTitle, { color: colors.text }]}>{t('travel.prefDetailEmpty')}</Text>
            <Text style={[UI.emptyBody, { color: colors.subText }]}>{t('collection.emptyBody')}</Text>
            {selectedPrefecture ? (
              <Pressable style={UI.emptyBtn} onPress={() => router.push(`/travel/new?prefecture=${selectedPrefecture}`)}>
                <Text style={UI.emptyBtnText}>{t('home.addStore')}</Text>
              </Pressable>
            ) : null}
          </NeuCard>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={UI.cardRow}>
              {visiblePosts.map((post) => {
                const prefName = t(`prefectures.${post.prefectureId}`);
                return (
                  <NeuCard key={post.id} style={[UI.card, { backgroundColor: colors.card }]}>
                    <View style={{ position: 'relative' }}>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            t('collection.deleteTitle'),
                            t('collection.deleteBody', { name: post.restaurantName }),
                            [
                              { text: t('common.cancel'), style: 'cancel' },
                              {
                                text: t('collection.deleteConfirm'),
                                style: 'destructive',
                                onPress: async () => {
                                  await deleteTravelLunchEntry(post.id);
                                  await refresh();
                                },
                              },
                            ]
                          );
                        }}
                        style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(254,242,242,0.9)' }}>
                        <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold, fontSize: 14 }}>−</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                          if (!permission.granted) {
                            Alert.alert(t('pref.photoPermissionTitle'), t('pref.photoPermissionBody'));
                            return;
                          }
                          const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.8,
                          });
                          if (result.canceled) return;
                          const uri = result.assets?.[0]?.uri;
                          if (!uri) return;
                          await updateTravelLunchEntryImage(post.id, uri);
                          await refresh();
                        }}>
                        <Image source={{ uri: post.imageUri }} style={[UI.cardImage, { backgroundColor: colors.chipBg }]} />
                      </Pressable>
                      <Pressable onPress={() => router.push(`/travel/pref/${post.prefectureId}`)}>
                        <View style={UI.cardBody}>
                          <Text style={[UI.cardTitle, { color: colors.text }]} numberOfLines={1}>{prefName}｜{post.restaurantName}</Text>
                          <Text style={[UI.cardMeta, { color: colors.subText }]} numberOfLines={1}>{post.genre} | {post.visitedAt}</Text>
                          {post.memo ? <Text style={[UI.cardMemo, { color: colors.subText }]} numberOfLines={1}>{post.memo}</Text> : null}
                        </View>
                      </Pressable>
                    </View>
                  </NeuCard>
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
