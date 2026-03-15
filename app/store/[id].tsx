import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { logStoreDeleted } from '@/src/analytics';
import { ShareCard } from '@/src/components/ShareCard';
import { t } from '@/src/i18n';
import { maybeShowInterstitial, preloadInterstitial } from '@/src/interstitialAd';
import type { Store } from '@/src/models';
import { captureAndShare } from '@/src/shareCardCapture';
import { usePremium } from '@/src/state/PremiumContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { useStores } from '@/src/state/StoresContext';
import { updateStore } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';
import { SafeImage, SafeImageBackground } from '@/src/ui/SafeImage';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
  } as const,
  cardImage: {
    borderRadius: 20,
    padding: 0,
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
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
  } as const,
  dangerBtn: {
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
  const { isPremium } = usePremium();
  const { stores, deleteStore, refresh } = useStores();
  const shareCardRef = useRef<View>(null);
  const [quickInfoExpanded, setQuickInfoExpanded] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);

  useEffect(() => {
    preloadInterstitial();
  }, []);
  const store = useMemo(() => stores.find((s) => s.id === storeId) ?? null, [stores, storeId]);
  const [draftName, setDraftName] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftUrl, setDraftUrl] = useState('');

  useEffect(() => {
    if (store) {
      setDraftName(store.name);
      setDraftNote(store.note ?? '');
      setDraftUrl(store.url ?? '');
    }
  }, [store?.id]);

  const saveTextFields = useCallback(async () => {
    if (!store) return;
    const patch: Partial<Omit<Store, 'id' | 'createdAt'>> = {};
    if (draftName !== store.name) patch.name = draftName;
    if (draftNote !== (store.note ?? '')) patch.note = draftNote;
    if (draftUrl !== (store.url ?? '')) patch.url = draftUrl || undefined;
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

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('album.photoPermissionTitle'), t('album.photoPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;
    const currentUris = store.photoUris ?? (store.photoUri ? [store.photoUri] : []);
    const newUris = [...currentUris, uri];
    await setField({ photoUri: newUris[0], photoUris: newUris });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>
        {(store.photoUris?.length ?? 0) > 1 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {store.photoUris!.map((uri, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <SafeImage uri={uri} style={{ width: 160, height: 160, borderRadius: 16 }} />
                    <Pressable
                      onPress={() => {
                        Alert.alert(t('storeDetail.deletePhotoTitle'), t('storeDetail.deletePhotoBody'), [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('storeDetail.deleteConfirm'),
                            style: 'destructive',
                            onPress: async () => {
                              const remaining = (store.photoUris ?? []).filter((_, idx) => idx !== i);
                              await setField({
                                photoUris: remaining.length > 0 ? remaining : undefined,
                                photoUri: remaining.length > 0 ? remaining[0] : undefined,
                              });
                            },
                          },
                        ]);
                      }}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14, lineHeight: 16 }}>×</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={pickPhoto}
                  style={{ width: 80, height: 160, borderRadius: 16, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28, color: colors.subText }}>+</Text>
                  <Text style={{ fontSize: 11, color: colors.subText, fontFamily: fonts.bold, marginTop: 4 }}>{t('storeDetail.addPhoto')}</Text>
                </Pressable>
              </View>
            </ScrollView>
            <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.nameLabel')}</Text>
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
                style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? { backgroundColor: colors.accentBg } : null) }}>
                <Text style={{ fontFamily: fonts.extraBold }}>
                  {store.isFavorite ? t('storeDetail.favoriteOn') : t('storeDetail.favoriteOff')}
                </Text>
              </Pressable>
            </NeuCard>
          </>
        ) : store.photoUri ? (
          <>
            <NeuCard style={UI.cardImage}>
              <SafeImageBackground uri={store.photoUri} style={{ width: '100%' }} imageStyle={{ borderRadius: 20 }}>
                <View style={UI.cardOverlay}>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10 }}>{t('storeDetail.nameLabel')}</Text>
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
                    style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? { backgroundColor: colors.accentBg } : null) }}>
                    <Text style={{ fontFamily: fonts.extraBold }}>
                      {store.isFavorite ? t('storeDetail.favoriteOn') : t('storeDetail.favoriteOff')}
                    </Text>
                  </Pressable>
                </View>
              </SafeImageBackground>
            </NeuCard>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={pickPhoto}
                style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, alignItems: 'center', flex: 1 }}>
                <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>+ {t('storeDetail.addPhoto')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert(t('storeDetail.deletePhotoTitle'), t('storeDetail.deletePhotoBody'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('storeDetail.deleteConfirm'),
                      style: 'destructive',
                      onPress: async () => {
                        await setField({ photoUri: undefined, photoUris: undefined });
                      },
                    },
                  ]);
                }}
                style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.extraBold, color: '#EF4444' }}>{t('storeDetail.deleteConfirm')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.nameLabel')}</Text>
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
                style={{ marginTop: 12, ...UI.chip, ...(store.isFavorite ? { backgroundColor: colors.accentBg } : null) }}>
                <Text style={{ fontFamily: fonts.extraBold }}>
                  {store.isFavorite ? t('storeDetail.favoriteOn') : t('storeDetail.favoriteOff')}
                </Text>
              </Pressable>
            </NeuCard>
            <Pressable
              onPress={pickPhoto}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>+ {t('storeDetail.addPhoto')}</Text>
            </Pressable>
          </>
        )}

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Pressable onPress={() => setQuickInfoExpanded((v) => !v)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }}>{t('storeDetail.quickInfo')}</Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.subText }}>
                {quickInfoExpanded ? '▲' : '▼'}
              </Text>
            </View>
          </Pressable>
          {quickInfoExpanded && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('storeDetail.waitTime')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {TIME_BANDS.map((band) => (
                  <Pressable
                    key={band}
                    onPress={() => setField({ timeBand: store.timeBand === band ? undefined : band })}
                    style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.timeBand === band ? { backgroundColor: colors.accentBg } : null) }}>
                    <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t(TIME_BAND_LABELS[band])}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('storeDetail.seating')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <Pressable
                  onPress={() => setField({ seating: store.seating === 'counter' ? undefined : 'counter' })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.seating === 'counter' ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.seatingCounter')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setField({ seating: store.seating === 'table' ? undefined : 'table' })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.seating === 'table' ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.seatingTable')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setField({ seating: store.seating === 'horigotatsu' ? undefined : 'horigotatsu' })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.seating === 'horigotatsu' ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.seatingHorigotatsu')}</Text>
                </Pressable>
              </View>

              <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('storeDetail.moodScene')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {MOOD_TAGS.map((tag) => (
                  <Pressable
                    key={tag.value}
                    onPress={() => setField({ moodTags: toggleTag(store.moodTags, tag.value) })}
                    style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.moodTags?.includes(tag.value) ? { backgroundColor: colors.accentBg } : null) }}>
                    <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t(tag.label)}</Text>
                  </Pressable>
                ))}
                {SCENE_TAGS.map((tag) => (
                  <Pressable
                    key={tag.value}
                    onPress={() => setField({ sceneTags: toggleTag(store.sceneTags, tag.value) })}
                    style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.sceneTags?.includes(tag.value) ? { backgroundColor: colors.accentBg } : null) }}>
                    <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t(tag.label)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Pressable onPress={() => setOtherExpanded((v) => !v)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }}>{t('storeDetail.otherInfo')}</Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.subText }}>
                {otherExpanded ? '▲' : '▼'}
              </Text>
            </View>
          </Pressable>
          {otherExpanded && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('storeDetail.parking')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <Pressable
                  onPress={() => setField({ parking: store.parking === 1 ? undefined : 1 })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.parking === 1 ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.parkingYes')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setField({ parking: store.parking === 0 ? undefined : 0 })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.parking === 0 ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.parkingNo')}</Text>
                </Pressable>
              </View>

              <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('storeDetail.smoking')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => setField({ smoking: store.smoking === 1 ? undefined : 1 })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.smoking === 1 ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.smokingAllowed')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setField({ smoking: store.smoking === 0 ? undefined : 0 })}
                  style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.smoking === 0 ? { backgroundColor: colors.accentBg } : null) }}>
                  <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.smokingNo')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 6, color: colors.text }}>{t('storeDetail.shareTitle')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => setField({ shareToEveryone: true })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(store.shareToEveryone ? { backgroundColor: colors.accentBg } : null) }}>
              <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.shareOn')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setField({ shareToEveryone: false })}
              style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, ...(!store.shareToEveryone ? { backgroundColor: colors.accentBg } : null) }}>
              <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.shareOff')}</Text>
            </Pressable>
          </View>
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.memoTitle')}</Text>
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
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeDetail.urlLabel')}</Text>
          <TextInput
            value={draftUrl}
            onChangeText={setDraftUrl}
            onBlur={saveTextFields}
            placeholder={t('storeDetail.urlPlaceholder')}
            style={{ ...UI.input, backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, color: colors.text }}
            placeholderTextColor={colors.subText}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {draftUrl ? (
            <Pressable onPress={() => Linking.openURL(draftUrl)} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontFamily: fonts.medium, fontSize: 13 }} numberOfLines={1}>
                {draftUrl}
              </Text>
            </Pressable>
          ) : null}
        </NeuCard>

        <Pressable
          onPress={async () => {
            const message = store.note
              ? `${store.name}\n${store.note}\n\n${t('storeDetail.shareAppMessage')}`
              : `${store.name}\n\n${t('storeDetail.shareAppMessage')}`;
            await captureAndShare(shareCardRef.current, message);
          }}
          style={{ ...UI.chip, backgroundColor: colors.card, shadowColor: colors.shadowDark, alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('storeDetail.shareButton')}</Text>
        </Pressable>

        <View style={{ gap: 10 }}>
          <Pressable onPress={async () => { await saveTextFields(); await maybeShowInterstitial(isPremium); router.back(); }} style={UI.primaryBtn}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('storeDetail.saveBack')}</Text>
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
            <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold }}>{t('storeDetail.deleteConfirm')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Off-screen ShareCard for capture */}
      <View style={{ position: 'absolute', left: -9999, top: 0 }} pointerEvents="none">
        <ShareCard ref={shareCardRef} store={store} isPremium={isPremium} />
      </View>

      <BottomAdBanner />
    </View>
  );
}
