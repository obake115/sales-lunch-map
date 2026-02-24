import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { getAdMobRewardedUnitId } from '@/src/admob';
import { logAdRewardWatched, logPremiumPurchased, logPurchaseRestored, logStoreRegistered } from '@/src/analytics';
import { maybeShowInterstitial, preloadInterstitial } from '@/src/interstitialAd';
import { t } from '@/src/i18n';
import { purchaseUnlimited, restorePurchases } from '@/src/purchases';
import { useStores } from '@/src/state/StoresContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { getPostLimitState, grantDailyRewardedSlot, type PostLimitState } from '@/src/storage';
import { usePremium } from '@/src/state/PremiumContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
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
  primaryBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
  } as const,
  paywallOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  } as const,
  paywallSheet: {
    backgroundColor: '#E9E4DA',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  } as const,
  paywallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as const,
  paywallTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 19,
    color: '#111827',
    marginBottom: 6,
  } as const,
  paywallSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 12,
  } as const,
  valueCard: {
    borderRadius: 14,
    backgroundColor: '#E9E4DA',
    padding: 12,
    marginBottom: 14,
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  paywallValueTitle: {
    fontFamily: fonts.extraBold,
    color: '#111827',
    marginBottom: 4,
  } as const,
  paywallValueSub: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 8,
  } as const,
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  } as const,
  planName: {
    fontFamily: fonts.extraBold,
    color: '#111827',
  } as const,
  priceLabel: {
    fontFamily: fonts.extraBold,
    color: '#111827',
  } as const,
  primaryCta: {
    borderRadius: 28,
    backgroundColor: '#4F78FF',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  } as const,
  primaryCtaText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
  } as const,
  adCta: {
    borderRadius: 12,
    backgroundColor: '#E9E4DA',
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  adCtaDisabled: {
    backgroundColor: '#D5D0C6',
  } as const,
  adCtaText: {
    color: '#111827',
    fontFamily: fonts.extraBold,
  } as const,
  adUsedText: {
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
  } as const,
  assureText: {
    color: '#6B7280',
    marginTop: 8,
  } as const,
  paywallIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  } as const,
  paywallIconText: {
    fontFamily: fonts.extraBold,
    color: '#111827',
  } as const,
  restoreText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: fonts.bold,
  } as const,
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  } as const,
  toastText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: fonts.bold,
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

function toRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

export default function StoreNewScreen() {
  const router = useRouter();
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const { addStore, stores } = useStores();
  const colors = useThemeColors();
  const { isPremium } = usePremium();

  useEffect(() => {
    preloadInterstitial();
  }, []);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [saving, setSaving] = useState(false);
  const [limitState, setLimitState] = useState<PostLimitState | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [pendingSaveDraft, setPendingSaveDraft] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    note?: string;
  } | null>(null);
  const [isProcessingUnlock, setIsProcessingUnlock] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canSave = latitude != null && longitude != null && !saving;

  const region: Region | null = mapRegion;

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = toRegion(pos.coords.latitude, pos.coords.longitude);
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      setMapRegion(next);
    })();
  }, []);

  useEffect(() => {
    const nextLat = lat ? Number(lat) : null;
    const nextLng = lng ? Number(lng) : null;
    if (typeof nextLat !== 'number' || Number.isNaN(nextLat)) return;
    if (typeof nextLng !== 'number' || Number.isNaN(nextLng)) return;
    setLatitude(nextLat);
    setLongitude(nextLng);
    setMapRegion(toRegion(nextLat, nextLng));
  }, [lat, lng]);

  const refreshLimit = useCallback(async () => {
    const next = await getPostLimitState(stores.length);
    setLimitState(next);
    return next;
  }, [stores.length]);

  useEffect(() => {
    refreshLimit();
  }, [refreshLimit]);

  useFocusEffect(
    useCallback(() => {
      refreshLimit();
    }, [refreshLimit])
  );

  const displayName = useMemo(
    () => (name.trim().length > 0 ? name.trim() : t('storeNew.unnamed')),
    [name]
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2000);
  }, []);

  const autoSavePending = useCallback(
    async (message: string) => {
      const draft = pendingSaveDraft;
      if (!draft) return;
      setPendingSaveDraft(null);
      try {
        setSaving(true);
        await addStore(draft);
        logStoreRegistered({ store_name: draft.name });
        showToast(message);
        setTimeout(() => {
          router.back();
        }, 600);
      } catch (e: any) {
        Alert.alert(t('common.saveFailed'), e?.message ?? t('common.tryAgain'));
      } finally {
        setSaving(false);
      }
    },
    [addStore, pendingSaveDraft, router, showToast]
  );

  const showRewardedAd = useCallback(async (): Promise<boolean> => {
    if (Constants.appOwnership === 'expo') {
      Alert.alert(t('storeNew.adUnavailableTitle'), t('storeNew.adUnavailableBody'));
      return false;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-google-mobile-ads');
      const RewardedAd = mod?.RewardedAd;
      const RewardedAdEventType = mod?.RewardedAdEventType;
      if (!RewardedAd || !RewardedAdEventType) {
        Alert.alert(t('storeNew.adPreparingTitle'), t('storeNew.adPreparingBody'));
        return false;
      }
      const ad = RewardedAd.createForAdRequest(getAdMobRewardedUnitId());
      return await new Promise<boolean>((resolve) => {
        let rewarded = false;
        const unsubscribe = ad.onAdEvent((type: string) => {
          if (type === RewardedAdEventType.LOADED) {
            ad.show();
          }
          if (type === RewardedAdEventType.EARNED_REWARD) {
            rewarded = true;
          }
          if (type === RewardedAdEventType.CLOSED) {
            unsubscribe();
            resolve(rewarded);
          }
          if (type === RewardedAdEventType.ERROR) {
            unsubscribe();
            resolve(false);
          }
        });
        ad.load();
      });
    } catch {
      Alert.alert(t('storeNew.adPreparingTitle'), t('storeNew.adPreparingBody'));
      return false;
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeNew.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('storeNew.namePlaceholder')}
            style={[UI.input, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark }]}
            {...INPUT_PROPS}
          />
        </NeuCard>

        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeNew.memoLabel')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('storeNew.memoPlaceholder')}
            style={[UI.input, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark }]}
            multiline
            {...INPUT_PROPS}
          />
        </NeuCard>

        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 6, color: colors.text }}>{t('storeNew.locationTitle')}</Text>
          <Text style={{ color: colors.subText, marginBottom: 10 }}>{t('storeNew.locationHelp')}</Text>
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: colors.card,
              height: 240,
            }}>
            {region ? (
              <MapView
                style={{ flex: 1 }}
                region={region}
                onRegionChangeComplete={(next) => {
                  setMapRegion(next);
                }}
                onPress={(e) => {
                  const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                  setLatitude(lat);
                  setLongitude(lng);
                  setMapRegion(toRegion(lat, lng));
                }}
                showsUserLocation>
                {latitude != null && longitude != null && (
                  <Marker
                    coordinate={{ latitude, longitude }}
                    title={displayName}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                      setLatitude(lat);
                      setLongitude(lng);
                      setMapRegion(toRegion(lat, lng));
                    }}
                  />
                )}
              </MapView>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.subText }}>{t('storeNew.locationLoading')}</Text>
              </View>
            )}
          </View>
        </NeuCard>

        <Pressable
          disabled={!canSave}
          onPress={async () => {
            if (!canSave) return;
            const nextLimit = await refreshLimit();
            const isPremium = !!nextLimit?.isUnlimited;
            const allowedSlots =
              isPremium ? Number.POSITIVE_INFINITY : (nextLimit?.freeLimit ?? 10) + (nextLimit?.extraSlotCount ?? 0);
            const countRegistered = stores.length;
            if (!isPremium && countRegistered >= allowedSlots) {
              setPendingSaveDraft({
                name: name.trim() || t('storeNew.unnamed'),
                latitude: latitude as number,
                longitude: longitude as number,
                note: note.trim() || undefined,
              });
              setPaywallVisible(true);
              return;
            }
            try {
              setSaving(true);
              const storeName = name.trim() || t('storeNew.unnamed');
              await addStore({
                name: storeName,
                latitude: latitude as number,
                longitude: longitude as number,
                note: note.trim() || undefined,
              });
              logStoreRegistered({ store_name: storeName });
              await maybeShowInterstitial(isPremium);
              router.back();
            } catch (e: any) {
              Alert.alert(t('common.saveFailed'), e?.message ?? t('common.tryAgain'));
            } finally {
              setSaving(false);
            }
          }}
          style={{
            ...UI.primaryBtn,
            backgroundColor: canSave ? UI.primaryBtn.backgroundColor : colors.chipBg,
          }}>
          <Text style={{ color: canSave ? 'white' : colors.subText, fontFamily: fonts.extraBold }}>
            {t('storeNew.saveButton')}
          </Text>
        </Pressable>
      </ScrollView>
      <BottomAdBanner />
      <Modal visible={paywallVisible} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={UI.paywallOverlay}>
          <View style={[UI.paywallSheet, { backgroundColor: colors.card }]}>
            <View style={UI.paywallHeader}>
              <Pressable onPress={() => setPaywallVisible(false)} style={UI.paywallIconBtn} disabled={isProcessingUnlock}>
                <Text style={[UI.paywallIconText, { fontSize: 18, color: colors.text }]}>×</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (isProcessingUnlock) return;
                  setIsProcessingUnlock(true);
                  const result = await restorePurchases();
                  setIsProcessingUnlock(false);
                  if (result.cancelled) return;
                  if (!result.success) {
                    showToast(result.message ?? t('storeNew.restoreFailed'));
                    return;
                  }
                  logPurchaseRestored();
                  await refreshLimit();
                  setPaywallVisible(false);
                  await autoSavePending(t('storeNew.restoreSuccess'));
                }}
                disabled={isProcessingUnlock}
                style={UI.paywallIconBtn}>
                <Text style={[UI.restoreText, { color: colors.subText }]}>{t('storeNew.restore')}</Text>
              </Pressable>
            </View>
            <Text style={[UI.paywallTitle, { color: colors.text }]}>{t('storeNew.limitTitle')}</Text>
            <Text style={[UI.paywallSubtitle, { color: colors.subText }]}>
              {t('storeNew.limitBody')}
            </Text>
            <View style={[UI.valueCard, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
              <Text style={[UI.paywallValueTitle, { color: colors.text }]}>{t('storeNew.valueTitle')}</Text>
              <Text style={[UI.paywallValueSub, { color: colors.subText }]}>{t('storeNew.valueBody')}</Text>
              <View style={UI.planRow}>
                <Text style={[UI.planName, { color: colors.text }]}>{t('storeNew.planName')}</Text>
                <Text style={[UI.priceLabel, { color: colors.text }]}>{t('storeNew.priceLabel')}</Text>
              </View>
            </View>
            <Pressable
              disabled={isProcessingUnlock}
              onPress={async () => {
                if (isProcessingUnlock) return;
                setIsProcessingUnlock(true);
                const result = await purchaseUnlimited();
                setIsProcessingUnlock(false);
                if (result.cancelled) return;
                if (!result.success) {
                  showToast(result.message ?? t('storeNew.purchaseFailed'));
                  return;
                }
                logPremiumPurchased();
                await refreshLimit();
                setPaywallVisible(false);
                await autoSavePending(t('storeNew.purchaseSuccess'));
              }}
              style={UI.primaryCta}>
              <Text style={UI.primaryCtaText}>{t('storeNew.purchaseCta')}</Text>
            </Pressable>
            <Pressable
              disabled={isProcessingUnlock || !limitState?.canWatchRewardAd}
              onPress={async () => {
                if (isProcessingUnlock || !limitState?.canWatchRewardAd) return;
                setIsProcessingUnlock(true);
                const rewarded = await showRewardedAd();
                logAdRewardWatched({ result: rewarded ? 'rewarded' : 'failed' });
                if (!rewarded) {
                  setIsProcessingUnlock(false);
                  showToast(t('storeNew.rewardFailed'));
                  return;
                }
                const granted = await grantDailyRewardedSlot();
                setIsProcessingUnlock(false);
                if (!granted) {
                  showToast(t('storeNew.rewardUsedUp'));
                  return;
                }
                await refreshLimit();
                setPaywallVisible(false);
                await autoSavePending(t('storeNew.rewardSuccess'));
              }}
              style={[UI.adCta, { backgroundColor: colors.card, shadowColor: colors.shadowDark }, !limitState?.canWatchRewardAd ? [UI.adCtaDisabled, { backgroundColor: colors.chipBg }] : null]}>
              <Text style={[UI.adCtaText, { color: colors.text }]}>{t('storeNew.rewardCta')}</Text>
            </Pressable>
            {!limitState?.canWatchRewardAd ? <Text style={[UI.adUsedText, { color: colors.subText }]}>{t('storeNew.rewardUsed')}</Text> : null}
            <Text style={[UI.assureText, { color: colors.subText }]}>{t('storeNew.assureKeep')}</Text>
            <Text style={[UI.assureText, { color: colors.subText }]}>{t('storeNew.assureRestore')}</Text>
            <Pressable
              onPress={() => setPaywallVisible(false)}
              disabled={isProcessingUnlock}
              style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: '#4F78FF', fontFamily: fonts.extraBold }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {toastMessage ? (
        <View style={UI.toast}>
          <Text style={UI.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}
