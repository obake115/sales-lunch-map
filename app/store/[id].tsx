import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { logReminderSetup, logStoreDeleted } from '@/src/analytics';
import { t } from '@/src/i18n';
import type { Store } from '@/src/models';
import { useThemeColors } from '@/src/state/ThemeContext';
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

const TIME_BANDS: NonNullable<Store['timeBand']>[] = ['10', '20', '30', '30+'];
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

  const colors = useThemeColors();
  const { stores, deleteStore, refresh } = useStores();
  const store = useMemo(() => stores.find((s) => s.id === storeId) ?? null, [stores, storeId]);
  const [showReminder, setShowReminder] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftNote, setDraftNote] = useState('');

  useEffect(() => {
    if (store) {
      setDraftName(store.name);
      setDraftNote(store.note ?? '');
    }
  }, [store?.id]);

  const saveTextFields = useCallback(async () => {
    if (!store) return;
    const patch: Partial<Omit<Store, 'id' | 'createdAt'>> = {};
    if (draftName !== store.name) patch.name = draftName;
    if (draftNote !== (store.note ?? '')) patch.note = draftNote;
    if (Object.keys(patch).length > 0) {
      await updateStore(store.id, patch);
      await refresh();
    }
  }, [store, draftName, draftNote, refresh]);

  if (!store) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: colors.subText }}>{t('storeDetail.notFound')}</Text>
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
                  value={draftName}
                  onChangeText={setDraftName}
                  onBlur={saveTextFields}
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
          <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
            <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.nameLabel')}</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              onBlur={saveTextFields}
              placeholder={t('storeDetail.namePlaceholder')}
              style={{ ...UI.input, backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, color: colors.text }}
              placeholderTextColor={colors.subText}
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

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.quickInfo')}</Text>
          <Text style={{ fontWeight: '800', marginBottom: 6, color: colors.text }}>{t('storeDetail.waitTime')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {TIME_BANDS.map((band) => (
              <Pressable
                key={band}
                onPress={() => setField({ timeBand: store.timeBand === band ? undefined : band })}
                style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.timeBand === band ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{t(TIME_BAND_LABELS[band])}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6, color: colors.text }}>{t('storeDetail.seating')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'counter' ? undefined : 'counter' })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.seating === 'counter' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.seatingCounter')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'table' ? undefined : 'table' })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.seating === 'table' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.seatingTable')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ seating: store.seating === 'horigotatsu' ? undefined : 'horigotatsu' })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.seating === 'horigotatsu' ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.seatingHorigotatsu')}</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6, color: colors.text }}>{t('storeDetail.moodScene')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {MOOD_TAGS.map((tag) => (
              <Pressable
                key={tag.value}
                onPress={() => setField({ moodTags: toggleTag(store.moodTags, tag.value) })}
                style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.moodTags?.includes(tag.value) ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{t(tag.label)}</Text>
              </Pressable>
            ))}
            {SCENE_TAGS.map((tag) => (
              <Pressable
                key={tag.value}
                onPress={() => setField({ sceneTags: toggleTag(store.sceneTags, tag.value) })}
                style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.sceneTags?.includes(tag.value) ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>{t(tag.label)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6, color: colors.text }}>{t('storeDetail.parking')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Pressable
              onPress={() => setField({ parking: store.parking === 1 ? undefined : 1 })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.parking === 1 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.parkingYes')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ parking: store.parking === 0 ? undefined : 0 })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.parking === 0 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.parkingNo')}</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginBottom: 6, color: colors.text }}>{t('storeDetail.smoking')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setField({ smoking: store.smoking === 1 ? undefined : 1 })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.smoking === 1 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.smokingAllowed')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ smoking: store.smoking === 0 ? undefined : 0 })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.smoking === 0 ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.smokingNo')}</Text>
            </Pressable>
          </View>

          <Text style={{ fontWeight: '800', marginTop: 12, marginBottom: 6, color: colors.text }}>{t('storeDetail.shareTitle')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setField({ shareToEveryone: true })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.shareToEveryone ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.shareOn')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ shareToEveryone: false })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(!store.shareToEveryone ? UI.chipActive : null) }}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{t('storeDetail.shareOff')}</Text>
            </Pressable>
          </View>
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.memoTitle')}</Text>
          <TextInput
            value={draftNote}
            onChangeText={setDraftNote}
            onBlur={saveTextFields}
            placeholder={t('storeDetail.memoPlaceholder')}
            style={{ ...UI.input, backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, color: colors.text }}
            placeholderTextColor={colors.subText}
            multiline
            {...INPUT_PROPS}
          />
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Pressable onPress={() => setShowReminder((v) => !v)}>
            <Text style={{ fontWeight: '900', fontSize: 16, color: colors.text }}>{t('storeDetail.remindTitle')}</Text>
          </Pressable>
          {showReminder && (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Pressable
                onPress={() => {
                  const next = !store.remindEnabled;
                  logReminderSetup({ store_id: store.id, enabled: next });
                  setField({ remindEnabled: next });
                }}
                style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.remindEnabled ? UI.chipActive : null) }}>
                <Text style={{ fontWeight: '800', color: colors.text }}>
                  {store.remindEnabled ? t('storeDetail.remindOn') : t('storeDetail.remindOff')}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {RADIUS_OPTIONS.map((radius) => (
                  <Pressable
                    key={radius}
                    onPress={() => setField({ remindRadiusM: radius })}
                    style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.remindRadiusM === radius ? UI.chipActive : null) }}>
                    <Text style={{ fontWeight: '800', color: colors.text }}>{radius}m</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </NeuCard>

        <View style={{ gap: 10 }}>
          <Pressable onPress={async () => { await saveTextFields(); router.back(); }} style={UI.primaryBtn}>
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
                    logStoreDeleted({ store_id: store.id });
                    await deleteStore(store.id);
                    router.back();
                  },
                },
              ]);
            }}
            style={{ ...UI.dangerBtn, backgroundColor: colors.dangerBg }}>
            <Text style={{ color: '#B91C1C', fontWeight: '900' }}>{t('storeDetail.deleteConfirm')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
