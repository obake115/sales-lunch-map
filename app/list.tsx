import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { haversineMeters } from '@/src/domain/distance';
import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { useStores } from '@/src/state/StoresContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

type SortMode = 'newest' | 'favorites' | 'nearest';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
  } as const,
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  inputGroup: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  } as const,
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  } as const,
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
  } as const,
  subtitle: {
    marginTop: 2,
  } as const,
  emptyText: {
  } as const,
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  } as const,
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  chipActive: {
    backgroundColor: '#FEF3C7',
  } as const,
  chipText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#374151',
  } as const,
  chipTextActive: {
    color: '#B45309',
  } as const,
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  } as const,
  distanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  } as const,
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  } as const,
  modalCard: {
    borderRadius: 20,
    padding: 16,
  } as const,
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.extraBold,
    marginBottom: 12,
  } as const,
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  } as const,
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  } as const,
  modalBtnPrimary: {
    backgroundColor: '#F59E0B',
  } as const,
  modalBtnText: {
    color: '#374151',
    fontFamily: fonts.bold,
  } as const,
  modalBtnTextPrimary: {
    color: '#FFFFFF',
  } as const,
} as const;

const INPUT_PROPS = {
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none' as const,
  autoComplete: 'off' as const,
  keyboardType: 'default' as const,
  blurOnSubmit: false,
};

function formatDistance(meters: number): string {
  if (meters < 1000) return t('list.distanceM', { value: Math.round(meters) });
  return t('list.distanceKm', { value: (meters / 1000).toFixed(1) });
}

export default function StoreListSearchScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { loading, stores } = useStores();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.granted) {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        } catch { /* ignore */ }
      } else {
        setLocationDenied(true);
      }
    })();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const store of stores) {
      for (const tag of store.moodTags ?? []) set.add(tag);
      for (const tag of store.sceneTags ?? []) set.add(tag);
    }
    return Array.from(set);
  }, [stores]);

  const distanceMap = useMemo(() => {
    if (!deviceLatLng) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const s of stores) {
      map.set(s.id, haversineMeters(deviceLatLng, { latitude: s.latitude, longitude: s.longitude }));
    }
    return map;
  }, [stores, deviceLatLng]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = stores.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (selectedTags.length === 0) return true;
      const tags = new Set([...(s.moodTags ?? []), ...(s.sceneTags ?? [])]);
      return selectedTags.every((t) => tags.has(t));
    });

    if (sortMode === 'favorites') {
      list = list.slice().sort((a, b) => {
        const af = a.isFavorite ? 1 : 0;
        const bf = b.isFavorite ? 1 : 0;
        if (bf !== af) return bf - af;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
    } else if (sortMode === 'nearest' && deviceLatLng) {
      list = list.slice().sort((a, b) => {
        const da = distanceMap.get(a.id) ?? Infinity;
        const db = distanceMap.get(b.id) ?? Infinity;
        return da - db;
      });
    } else {
      list = list.slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }

    return list;
  }, [stores, query, selectedTags, sortMode, deviceLatLng, distanceMap]);

  const tagLabel = (tag: string) => {
    if (tag === 'サクッと') return t('storeDetail.mood.quick');
    if (tag === 'ゆっくり') return t('storeDetail.mood.relaxed');
    if (tag === '接待向き') return t('storeDetail.mood.business');
    if (tag === '1人OK') return t('storeDetail.scene.solo');
    if (tag === 'ご褒美') return t('storeDetail.scene.reward');
    return tag;
  };

  const handleRequestLocation = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.granted) {
      setLocationDenied(false);
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setSortMode('nearest');
      } catch { /* ignore */ }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <NeuCard style={[UI.inputGroup, { backgroundColor: colors.card }]}>
          <View style={UI.inputRow}>
            <Pressable
              onPress={() => {
                setDraftTags(selectedTags);
                setFilterVisible(true);
              }}
              style={[UI.chip, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
              <Text style={UI.chipText}>{t('list.filterButton')}</Text>
            </Pressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('list.searchPlaceholder')}
              placeholderTextColor="#AAAAAA"
              style={[UI.input, { flex: 1, backgroundColor: colors.card, shadowColor: colors.shadowDark }]}
              {...INPUT_PROPS}
            />
          </View>
        </NeuCard>

        {/* Sort chips */}
        <View style={UI.sortRow}>
          {(['newest', 'favorites', 'nearest'] as const).map((mode) => {
            const active = sortMode === mode;
            const isNearestDisabled = mode === 'nearest' && !deviceLatLng && locationDenied;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  if (mode === 'nearest' && !deviceLatLng) {
                    handleRequestLocation();
                    return;
                  }
                  setSortMode(mode);
                }}
                disabled={isNearestDisabled}
                style={[
                  UI.sortChip,
                  { backgroundColor: colors.card, shadowColor: colors.shadowDark },
                  active && UI.chipActive,
                  isNearestDisabled && { opacity: 0.4 },
                ]}>
                <Text style={[UI.chipText, active && UI.chipTextActive]}>
                  {mode === 'newest' ? t('list.sortNewest') : mode === 'favorites' ? t('list.sortFavorites') : t('list.sortNearest')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading && <Text style={[UI.emptyText, { color: colors.subText }]}>{t('list.loading')}</Text>}
        {!loading && filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🍽️</Text>
            <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>{t('list.emptyTitle')}</Text>
            <Text style={{ fontSize: 13, color: colors.subText, textAlign: 'center' }}>{t('list.emptyBody')}</Text>
            <Pressable
              onPress={() => router.push('/map')}
              style={{ marginTop: 8, backgroundColor: '#4F78FF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 28 }}>
              <Text style={{ color: 'white', fontFamily: fonts.bold }}>{t('list.emptyCta')}</Text>
            </Pressable>
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50).duration(300)}>
              <NeuCard style={{ borderRadius: 20 }}>
                <Pressable
                  onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}
                  style={{ padding: 14 }}>
                  <Text style={[UI.title, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.note ? <Text style={[UI.subtitle, { color: colors.subText }]}>{item.note}</Text> : null}
                  {sortMode === 'nearest' && deviceLatLng && distanceMap.has(item.id) && (
                    <View style={[UI.distanceBadge, { backgroundColor: colors.chipBg }]}>
                      <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.subText }}>
                        {formatDistance(distanceMap.get(item.id)!)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </NeuCard>
            </Animated.View>
          )}
        />
      </View>

      <BottomAdBanner />

      <Modal transparent visible={filterVisible} animationType="fade">
        <View style={UI.modalBackdrop}>
          <NeuCard style={{ borderRadius: 20, padding: 16 }}>
            <Text style={[UI.modalTitle, { color: colors.text }]}>{t('list.filterTitle')}</Text>
            <ScrollView>
              <View style={[UI.filterRow, { flexWrap: 'wrap' }]}>
                {allTags.map((tag) => {
                  const active = draftTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        setDraftTags((prev) =>
                          active ? prev.filter((t) => t !== tag) : [...prev, tag]
                        )
                      }
                      style={[UI.chip, { backgroundColor: colors.card, shadowColor: colors.shadowDark }, active && UI.chipActive]}>
                      <Text style={[UI.chipText, active && UI.chipTextActive]}>{tagLabel(tag)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={UI.modalActions}>
              <Pressable
                onPress={() => {
                  setDraftTags(selectedTags);
                  setFilterVisible(false);
                }}
                style={[UI.modalBtn, { backgroundColor: colors.chipBg }]}>
                <Text style={UI.modalBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedTags(draftTags);
                  setFilterVisible(false);
                }}
                style={[UI.modalBtn, { backgroundColor: colors.chipBg }, UI.modalBtnPrimary]}>
                <Text style={[UI.modalBtnText, UI.modalBtnTextPrimary]}>{t('list.apply')}</Text>
              </Pressable>
            </View>
          </NeuCard>
        </View>
      </Modal>
    </View>
  );
}
