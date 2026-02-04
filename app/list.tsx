import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

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
} as const;

export default function StoreListSearchScreen() {
  const router = useRouter();
  const { loading, stores } = useStores();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => s.name.toLowerCase().includes(q));
  }, [stores, query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="店舗名で検索"
          placeholderTextColor="#AAAAAA"
          style={{ ...UI.input, marginBottom: 12 }}
        />

        {loading && <Text style={UI.emptyText}>読み込み中...</Text>}
        {!loading && filtered.length === 0 && <Text style={UI.emptyText}>一致する店舗がありません。</Text>}

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
    </View>
  );
}
