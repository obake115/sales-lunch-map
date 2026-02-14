import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { t } from '@/src/i18n';
import { useStores } from '@/src/state/StoresContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';

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
    borderColor: '#E5E5E5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  } as const,
  inputGroup: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
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
    fontWeight: '700',
    color: '#111827',
  } as const,
  subtitle: {
    color: '#6B7280',
    marginTop: 2,
  } as const,
  emptyText: {
    color: '#6B7280',
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  } as const,
  chipActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  } as const,
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  } as const,
  chipTextActive: {
    color: '#B45309',
  } as const,
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  } as const,
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  } as const,
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
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
    backgroundColor: '#F3F4F6',
  } as const,
  modalBtnPrimary: {
    backgroundColor: '#F59E0B',
  } as const,
  modalBtnText: {
    color: '#374151',
    fontWeight: '700',
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

export default function StoreListSearchScreen() {
  const router = useRouter();
  const { loading, stores } = useStores();
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const store of stores) {
      for (const tag of store.moodTags ?? []) set.add(tag);
      for (const tag of store.sceneTags ?? []) set.add(tag);
    }
    return Array.from(set);
  }, [stores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (selectedTags.length === 0) return true;
      const tags = new Set([...(s.moodTags ?? []), ...(s.sceneTags ?? [])]);
      return selectedTags.every((t) => tags.has(t));
    });
  }, [stores, query, selectedTags]);
  const tagLabel = (tag: string) => {
    if (tag === 'サクッと') return t('storeDetail.mood.quick');
    if (tag === 'ゆっくり') return t('storeDetail.mood.relaxed');
    if (tag === '接待向き') return t('storeDetail.mood.business');
    if (tag === '1人OK') return t('storeDetail.scene.solo');
    if (tag === 'ご褒美') return t('storeDetail.scene.reward');
    return tag;
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <View style={UI.inputGroup}>
          <View style={UI.inputRow}>
            <Pressable
              onPress={() => {
                setDraftTags(selectedTags);
                setFilterVisible(true);
              }}
              style={UI.chip}>
              <Text style={UI.chipText}>{t('list.filterButton')}</Text>
            </Pressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('list.searchPlaceholder')}
              placeholderTextColor="#AAAAAA"
              style={[UI.input, { flex: 1 }]}
              {...INPUT_PROPS}
            />
          </View>
        </View>

        {loading && <Text style={UI.emptyText}>{t('list.loading')}</Text>}
        {!loading && filtered.length === 0 && <Text style={UI.emptyText}>{t('list.empty')}</Text>}

        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}
              style={UI.card}>
              <Text style={UI.title} numberOfLines={1}>
                {item.name}
              </Text>
              {item.note ? <Text style={UI.subtitle}>{item.note}</Text> : null}
            </Pressable>
          )}
        />
      </View>

      <BottomAdBanner />

      <Modal transparent visible={filterVisible} animationType="fade">
        <View style={UI.modalBackdrop}>
          <View style={UI.modalCard}>
            <Text style={UI.modalTitle}>{t('list.filterTitle')}</Text>
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
                      style={[UI.chip, active && UI.chipActive]}>
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
                style={UI.modalBtn}>
                <Text style={UI.modalBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedTags(draftTags);
                  setFilterVisible(false);
                }}
                style={[UI.modalBtn, UI.modalBtnPrimary]}>
                <Text style={[UI.modalBtnText, UI.modalBtnTextPrimary]}>{t('list.apply')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
