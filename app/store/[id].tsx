import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { Store } from '@/src/models';
import { useStores } from '@/src/state/StoresContext';
import { updateStore } from '@/src/storage';
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
  cardImage: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 0,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: 'hidden',
  } as const,
  cardOverlay: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  } as const,
  input: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  } as const,
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7E2D5',
    backgroundColor: '#FFFFFF',
  } as const,
  chipActive: {
    borderColor: '#60A5FA',
    backgroundColor: '#DBEAFE',
  } as const,
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  } as const,
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  } as const,
} as const;

const TIME_BANDS: Array<Store['timeBand']> = ['10', '20', '30'];
const RADIUS_OPTIONS = [100, 200, 300, 400, 500];
const MOOD_TAGS = ['サクッと', 'ゆっくり', '商談向き'];
const SCENE_TAGS = ['1人OK', 'ご褒美'];

export default function PlaceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = id ?? '';

  const { stores, deleteStore, refresh } = useStores();
  const store = useMemo(() => stores.find((s) => s.id === storeId) ?? null, [stores, storeId]);
  const [showReminder, setShowReminder] = useState(false);

  if (!store) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: '#6B7280' }}>ランチ候補が見つかりません。</Text>
      </View>
    );
  }

  const setField = async (patch: Partial<Omit<Store, 'id' | 'createdAt'>>) => {
    await updateStore(store.id, patch);
    await refresh();
  };
  const toggleTag = (list: string[] | undefined, value: string) => {
    const current = list ?? [];
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>
        {store.photoUri ? (
          <ImageBackground source={{ uri: store.photoUri }} style={UI.cardImage} imageStyle={{ borderRadius: 16 }}>
            <View style={UI.cardOverlay}>
              <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>ランチ候補名</Text>
              <TextInput
                value={store.name}
                onChangeText={(text) => setField({ name: text })}
                placeholder="例：現場前の定食屋"
                style={UI.input}
              />
              <Pressable
                onPress={() => setField({ isFavorite: !store.isFavorite })}
                style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{store.isFavorite ? '⭐ 次回候補にする' : '☆ 次回候補にする'}</Text>
              </Pressable>
            </View>
          </ImageBackground>
        ) : (
          <View style={UI.card}>
            <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>ランチ候補名</Text>
            <TextInput
              value={store.name}
              onChangeText={(text) => setField({ name: text })}
              placeholder="例：現場前の定食屋"
              style={UI.input}
            />
            <Pressable
              onPress={() => setField({ isFavorite: !store.isFavorite })}
              style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{store.isFavorite ? '⭐ 次回候補にする' : '☆ 次回候補にする'}</Text>
            </Pressable>
          </View>
        )}

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>クイック情報</Text>
          <Text style={{ fontWeight: '800', marginBottom: 6 }}>所要時間</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {TIME_BANDS.map((band) => (
              <Pressable
                key={band}
                onPress={() => setField({ timeBand: store.timeBand === band ? undefined : band })}
                style={{ ...UI.chip, ...(store.timeBand === band ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{band}分</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>駐車場</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Pressable
              onPress={() => setField({ parking: store.parking === 1 ? undefined : 1 })}
              style={{ ...UI.chip, ...(store.parking === 1 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>あり</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ parking: store.parking === 0 ? undefined : 0 })}
              style={{ ...UI.chip, ...(store.parking === 0 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>なし</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>喫煙</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Pressable
              onPress={() => setField({ smoking: store.smoking === 1 ? undefined : 1 })}
              style={{ ...UI.chip, ...(store.smoking === 1 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>可</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ smoking: store.smoking === 0 ? undefined : 0 })}
              style={{ ...UI.chip, ...(store.smoking === 0 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>不可</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>席</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'counter' ? undefined : 'counter' })}
              style={{ ...UI.chip, ...(store.seating === 'counter' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>カウンター</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'table' ? undefined : 'table' })}
              style={{ ...UI.chip, ...(store.seating === 'table' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>テーブル</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginTop: 10, marginBottom: 6 }}>気分・シーン</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {MOOD_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => setField({ moodTags: toggleTag(store.moodTags, tag) })}
                style={{ ...UI.chip, ...(store.moodTags?.includes(tag) ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{tag}</Text>
              </Pressable>
            ))}
            {SCENE_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => setField({ sceneTags: toggleTag(store.sceneTags, tag) })}
                style={{ ...UI.chip, ...(store.sceneTags?.includes(tag) ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{tag}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>メモ</Text>
          <TextInput
            value={store.note ?? ''}
            onChangeText={(text) => setField({ note: text })}
            placeholder="例：14時以降は空きやすい"
            style={UI.input}
            multiline
          />
        </View>

        <View style={UI.card}>
          <Pressable onPress={() => setShowReminder((v) => !v)}>
            <Text style={{ fontWeight: '900', fontSize: 16 }}>リマインド設定（詳細内）</Text>
          </Pressable>
          {showReminder && (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Pressable
                onPress={() => setField({ remindEnabled: !store.remindEnabled })}
                style={{ ...UI.chip, ...(store.remindEnabled ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{store.remindEnabled ? 'ON' : 'OFF'}</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {RADIUS_OPTIONS.map((radius) => (
                  <Pressable
                    key={radius}
                    onPress={() => setField({ remindRadiusM: radius })}
                    style={{ ...UI.chip, ...(store.remindRadiusM === radius ? UI.chipActive : null) }}>
                    <Text style={{ fontWeight: '800' }}>{radius}m</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Pressable onPress={() => router.back()} style={UI.primaryBtn}>
            <Text style={{ color: 'white', fontWeight: '900' }}>保存して戻る</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('削除しますか？', 'このランチ候補を削除します。', [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '削除',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteStore(store.id);
                    router.back();
                  },
                },
              ]);
            }}
            style={UI.dangerBtn}>
            <Text style={{ color: '#B91C1C', fontWeight: '900' }}>削除</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
