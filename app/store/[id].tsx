import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { t } from '@/src/i18n';
import type { Store } from '@/src/models';
import { useStores } from '@/src/state/StoresContext';
import { updateStore } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
  } as const,
  cardImage: {
    borderRadius: 20,
    padding: 0,
    backgroundColor: '#E9E4DA',
    overflow: 'hidden',
  } as const,
  cardOverlay: {
    padding: 14,
    backgroundColor: 'rgba(233, 228, 218, 0.6)',
  } as const,
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#E9E4DA',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E9E4DA',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  chipActive: {
    backgroundColor: '#DBEAFE',
  } as const,
  primaryBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
  } as const,
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
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

const TIME_BANDS: Array<Store['timeBand']> = ['10', '20', '30', '30+'];
const TIME_BAND_LABELS: Record<NonNullable<Store['timeBand']>, string> = {
  '10': 'storeDetail.timeBands.10',
  '20': 'storeDetail.timeBands.20',
  '30': 'storeDetail.timeBands.30',
  '30+': 'storeDetail.timeBands.30plus',
};
const RADIUS_OPTIONS = [100, 200, 300, 400, 500];
const MOOD_TAGS = [
  { value: 'サクッと', label: 'storeDetail.mood.quick' },
  { value: 'ゆっくり', label: 'storeDetail.mood.relaxed' },
  { value: '接待向き', label: 'storeDetail.mood.business' },
];
const SCENE_TAGS = [
  { value: '1人OK', label: 'storeDetail.scene.solo' },
  { value: 'ご褒美', label: 'storeDetail.scene.reward' },
];

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
        <Text style={{ color: '#6B7280' }}>{t('storeDetail.notFound')}</Text>
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
          <NeuCard style={UI.cardImage}>
            <ImageBackground source={{ uri: store.photoUri }} style={{ width: '100%' }} imageStyle={{ borderRadius: 20 }}>
              <View style={UI.cardOverlay}>
                <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>{t('storeDetail.nameLabel')}</Text>
                <TextInput
                  value={store.name}
                  onChangeText={(text) => setField({ name: text })}
                  placeholder={t('storeDetail.namePlaceholder')}
                  style={UI.input}
                  {...INPUT_PROPS}
                />
                <Pressable
                  onPress={() => setField({ isFavorite: !store.isFavorite })}
                  style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? UI.chipActive : null) }}>
                  <Text style={{ fontWeight: '800' }}>
                    {store.isFavorite ? t('storeDetail.favoriteOn') : t('storeDetail.favoriteOff')}
                  </Text>
                </Pressable>
              </View>
            </ImageBackground>
          </NeuCard>
        ) : (
          <NeuCard style={UI.card}>
            <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>{t('storeDetail.nameLabel')}</Text>
            <TextInput
              value={store.name}
              onChangeText={(text) => setField({ name: text })}
              placeholder={t('storeDetail.namePlaceholder')}
              style={UI.input}
              {...INPUT_PROPS}
            />
            <Pressable
              onPress={() => setField({ isFavorite: !store.isFavorite })}
              style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>
                {store.isFavorite ? t('storeDetail.favoriteOn') : t('storeDetail.favoriteOff')}
              </Text>
            </Pressable>
          </NeuCard>
        )}

        <NeuCard style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>{t('storeDetail.quickInfo')}</Text>
          <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('storeDetail.waitTime')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {TIME_BANDS.map((band) => (
              <Pressable
                key={band}
                onPress={() => setField({ timeBand: store.timeBand === band ? undefined : band })}
                style={{ ...UI.chip, ...(store.timeBand === band ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{t(TIME_BAND_LABELS[band])}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('storeDetail.seating')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'counter' ? undefined : 'counter' })}
              style={{ ...UI.chip, ...(store.seating === 'counter' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.seatingCounter')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'table' ? undefined : 'table' })}
              style={{ ...UI.chip, ...(store.seating === 'table' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.seatingTable')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'horigotatsu' ? undefined : 'horigotatsu' })}
              style={{ ...UI.chip, ...(store.seating === 'horigotatsu' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.seatingHorigotatsu')}</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('storeDetail.moodScene')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {MOOD_TAGS.map((tag) => (
              <Pressable
                key={tag.value}
                onPress={() => setField({ moodTags: toggleTag(store.moodTags, tag.value) })}
                style={{ ...UI.chip, ...(store.moodTags?.includes(tag.value) ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{t(tag.label)}</Text>
              </Pressable>
            ))}
            {SCENE_TAGS.map((tag) => (
              <Pressable
                key={tag.value}
                onPress={() => setField({ sceneTags: toggleTag(store.sceneTags, tag.value) })}
                style={{ ...UI.chip, ...(store.sceneTags?.includes(tag.value) ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>{t(tag.label)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('storeDetail.parking')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Pressable
              onPress={() => setField({ parking: store.parking === 1 ? undefined : 1 })}
              style={{ ...UI.chip, ...(store.parking === 1 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.parkingYes')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ parking: store.parking === 0 ? undefined : 0 })}
              style={{ ...UI.chip, ...(store.parking === 0 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.parkingNo')}</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('storeDetail.smoking')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setField({ smoking: store.smoking === 1 ? undefined : 1 })}
              style={{ ...UI.chip, ...(store.smoking === 1 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.smokingAllowed')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ smoking: store.smoking === 0 ? undefined : 0 })}
              style={{ ...UI.chip, ...(store.smoking === 0 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.smokingNo')}</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginTop: 12, marginBottom: 6 }}>{t('storeDetail.shareTitle')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setField({ shareToEveryone: true })}
              style={{ ...UI.chip, ...(store.shareToEveryone ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.shareOn')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ shareToEveryone: false })}
              style={{ ...UI.chip, ...(!store.shareToEveryone ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800' }}>{t('storeDetail.shareOff')}</Text>
            </Pressable>
          </View>
        </NeuCard>

        <NeuCard style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10 }}>{t('storeDetail.memoTitle')}</Text>
          <TextInput
            value={store.note ?? ''}
            onChangeText={(text) => setField({ note: text })}
            placeholder={t('storeDetail.memoPlaceholder')}
            style={UI.input}
            multiline
            {...INPUT_PROPS}
          />
        </NeuCard>

        <NeuCard style={UI.card}>
          <Pressable onPress={() => setShowReminder((v) => !v)}>
            <Text style={{ fontWeight: '900', fontSize: 16 }}>{t('storeDetail.remindTitle')}</Text>
          </Pressable>
          {showReminder && (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Pressable
                onPress={() => setField({ remindEnabled: !store.remindEnabled })}
                style={{ ...UI.chip, ...(store.remindEnabled ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800' }}>
                  {store.remindEnabled ? t('storeDetail.remindOn') : t('storeDetail.remindOff')}
                </Text>
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
        </NeuCard>

        <View style={{ gap: 10 }}>
          <Pressable onPress={() => router.back()} style={UI.primaryBtn}>
            <Text style={{ color: 'white', fontWeight: '900' }}>{t('storeDetail.saveBack')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(t('storeDetail.deleteTitle'), t('storeDetail.deleteBody'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('storeDetail.deleteConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    await deleteStore(store.id);
                    router.back();
                  },
                },
              ]);
            }}
            style={UI.dangerBtn}>
            <Text style={{ color: '#B91C1C', fontWeight: '900' }}>{t('storeDetail.deleteConfirm')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
