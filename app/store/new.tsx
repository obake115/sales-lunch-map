import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { getAdMobRewardedUnitId } from '@/src/admob';
import { logAdRewardWatched, logPremiumPurchased, logPurchaseRestored, logStoreRegistered } from '@/src/analytics';
import { maybeShowInterstitial, preloadInterstitial } from '@/src/interstitialAd';
import { t } from '@/src/i18n';
import { purchaseUnlimited, restorePurchases } from '@/src/purchases';
import { useStores } from '@/src/state/StoresContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { earnFoodBadge, getEarnedFoodBadges, getPostLimitState, getStores, getTravelLunchProgress, grantDailyRewardedSlot, isFoodBadgeCollectionPurchased, type PostLimitState } from '@/src/storage';
import { usePremium } from '@/src/state/PremiumContext';
import { BadgeCelebrationModal } from '@/src/components/BadgeCelebrationModal';
import { MilestoneShareModal, type MilestoneType } from '@/src/components/MilestoneShareModal';
import { getFoodBadge, type FoodBadge } from '@/src/domain/foodBadges';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';
import { PremiumPaywall } from '@/src/components/PremiumPaywall';
import { coordToPrefectureId } from '@/src/domain/prefectureLookup';
import { canShowPaywall } from '@/src/paywallTrigger';

// Colors are resolved at render time via useThemeColors()
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
  primaryBtn: {
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
    marginBottom: 6,
  } as const,
  paywallSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  } as const,
  valueCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  paywallValueTitle: {
    fontFamily: fonts.extraBold,
    marginBottom: 4,
  } as const,
  paywallValueSub: {
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
  } as const,
  priceLabel: {
    fontFamily: fonts.extraBold,
  } as const,
  primaryCta: {
    borderRadius: 28,
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
    paddingVertical: 12,
    alignItems: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  adCtaText: {
    fontFamily: fonts.extraBold,
  } as const,
  adUsedText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
  } as const,
  assureText: {
    marginTop: 8,
  } as const,
  paywallIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  } as const,
  paywallIconText: {
    fontFamily: fonts.extraBold,
  } as const,
  restoreText: {
    fontSize: 12,
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
  const { lat, lng, sharedPhotoUri } = useLocalSearchParams<{ lat?: string; lng?: string; sharedPhotoUri?: string }>();
  const { addStore, updateStore, stores } = useStores();
  const colors = useThemeColors();
  const { isPremium } = usePremium();

  useEffect(() => {
    preloadInterstitial();
  }, []);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [saving, setSaving] = useState(false);
  const [limitState, setLimitState] = useState<PostLimitState | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [premiumPaywallVisible, setPremiumPaywallVisible] = useState(false);
  const [premiumPaywallTrigger, setPremiumPaywallTrigger] = useState('prefDuplicate');
  const [pendingSaveDraft, setPendingSaveDraft] = useState<{
    name: string;
    latitude: number;
    longitude: number;
    note?: string;
    url?: string;
  } | null>(null);
  const [isProcessingUnlock, setIsProcessingUnlock] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(sharedPhotoUri ?? null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [badgeCelebrationVisible, setBadgeCelebrationVisible] = useState(false);
  const [celebrationBadge, setCelebrationBadge] = useState<FoodBadge | null>(null);
  const [celebrationPrefName, setCelebrationPrefName] = useState('');
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [goBackAfterBadge, setGoBackAfterBadge] = useState(false);
  const [badgeCollectionPurchased, setBadgeCollectionPurchased] = useState(false);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('newPref');
  const [milestoneVisited, setMilestoneVisited] = useState(0);
  const [milestoneStoreCount, setMilestoneStoreCount] = useState(0);

  useEffect(() => {
    isFoodBadgeCollectionPurchased().then(setBadgeCollectionPurchased);
  }, []);

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

  const checkAndShowBadge = useCallback(async (storeLat: number, storeLng: number): Promise<boolean> => {
    const prefId = coordToPrefectureId(storeLat, storeLng);
    if (!prefId) return false;
    const isNew = await earnFoodBadge(prefId);
    if (!isNew) return false;
    const badge = getFoodBadge(prefId);
    if (!badge) return false;
    const earned = await getEarnedFoodBadges();
    const prefName = t(`prefectures.${prefId}`) as string;
    setCelebrationBadge(badge);
    setCelebrationPrefName(prefName);
    setCelebrationCount(earned.length);
    setBadgeCelebrationVisible(true);
    return true;
  }, []);

  const checkAndShowMilestone = useCallback(async (): Promise<boolean> => {
    const [allStores, visited] = await Promise.all([getStores(), getTravelLunchProgress()]);
    const storeCount = allStores.length;
    setMilestoneVisited(visited);
    setMilestoneStoreCount(storeCount);
    if (storeCount === 50) {
      setMilestoneType('fiftyStores');
      setMilestoneVisible(true);
      return true;
    }
    if (visited === 10) {
      setMilestoneType('tenPrefs');
      setMilestoneVisible(true);
      return true;
    }
    return false;
  }, []);

  const autoSavePending = useCallback(
    async (message: string) => {
      const draft = pendingSaveDraft;
      if (!draft) return;
      setPendingSaveDraft(null);
      try {
        setSaving(true);
        const created = await addStore(draft);
        if (photoUri && created?.id) {
          await updateStore(created.id, { photoUri, photoUris: [photoUri] });
        }
        logStoreRegistered({ store_name: draft.name });
        const badgeShown = await checkAndShowBadge(draft.latitude, draft.longitude);
        if (badgeShown) {
          setGoBackAfterBadge(true);
        } else {
          const milestoneShown = await checkAndShowMilestone();
          if (milestoneShown) {
            setGoBackAfterBadge(true);
          } else {
            showToast(message);
            setTimeout(() => {
              router.back();
            }, 600);
          }
        }
      } catch (e: any) {
        Alert.alert(t('common.saveFailed'), e?.message ?? t('common.tryAgain'));
      } finally {
        setSaving(false);
      }
    },
    [addStore, pendingSaveDraft, router, showToast, checkAndShowMilestone]
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
        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeNew.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('storeNew.namePlaceholder')}
            style={{ ...UI.input, backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, color: colors.text }}
            placeholderTextColor={colors.subText}
            {...INPUT_PROPS}
          />
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeNew.memoLabel')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('storeNew.memoPlaceholder')}
            style={{ ...UI.input, backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, color: colors.text }}
            placeholderTextColor={colors.subText}
            multiline
            {...INPUT_PROPS}
          />
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeNew.urlLabel')}</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={t('storeNew.urlPlaceholder')}
            style={{ ...UI.input, backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, color: colors.text }}
            placeholderTextColor={colors.subText}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </NeuCard>

        {photoUri ? (
          <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 10, color: colors.text }}>{t('storeNew.photoLabel')}</Text>
            <View style={{ alignItems: 'center' }}>
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 200, borderRadius: 14 }} resizeMode="cover" />
              <Pressable onPress={() => setPhotoUri(null)} style={{ marginTop: 8 }}>
                <Text style={{ color: '#EF4444', fontFamily: fonts.bold }}>{t('storeNew.photoRemove')}</Text>
              </Pressable>
            </View>
          </NeuCard>
        ) : (
          <Pressable
            onPress={async () => {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert(t('storeNew.photoPermissionTitle'), t('storeNew.photoPermissionBody'));
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              if (result.canceled) return;
              const uri = result.assets?.[0]?.uri;
              if (uri) setPhotoUri(uri);
            }}
            style={{ ...UI.input, backgroundColor: colors.card, shadowColor: colors.shadowDark, alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>+ {t('storeNew.addPhoto')}</Text>
          </Pressable>
        )}

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Pressable onPress={() => setMapExpanded((v) => !v)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }}>{t('storeNew.locationTitle')}</Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.primary }}>
                {mapExpanded ? '▲' : t('storeNew.locationChange')}
              </Text>
            </View>
            {!mapExpanded && (
              <Text style={{ color: colors.subText, marginTop: 6, fontSize: 13 }}>
                {latitude != null ? `📍 ${t('storeNew.locationNearby')}` : t('storeNew.locationLoading')}
              </Text>
            )}
          </Pressable>
          {mapExpanded && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: colors.subText, marginBottom: 10, fontSize: 13 }}>{t('storeNew.locationHelp')}</Text>
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
            </View>
          )}
        </NeuCard>

        <Pressable
          disabled={!canSave}
          onPress={async () => {
            if (!canSave) return;
            const nextLimit = await refreshLimit();
            const isPremiumUser = !!nextLimit?.isUnlimited;

            // Soft-block: same prefecture 2nd store trigger
            if (!isPremiumUser && latitude != null && longitude != null) {
              const prefId = coordToPrefectureId(latitude, longitude);
              if (prefId) {
                const sameCount = stores.filter(s => coordToPrefectureId(s.latitude, s.longitude) === prefId).length;
                if (sameCount >= 1 && await canShowPaywall()) {
                  setPendingSaveDraft({
                    name: name.trim() || t('storeNew.unnamed'),
                    latitude: latitude as number,
                    longitude: longitude as number,
                    note: note.trim() || undefined,
                    url: url.trim() || undefined,
                  });
                  setPremiumPaywallTrigger('prefDuplicate');
                  setPremiumPaywallVisible(true);
                  return;
                }
              }
            }

            // Hard-block: post limit reached
            const allowedSlots =
              isPremiumUser ? Number.POSITIVE_INFINITY : (nextLimit?.freeLimit ?? 10) + (nextLimit?.extraSlotCount ?? 0);
            const countRegistered = stores.length;
            if (!isPremiumUser && countRegistered >= allowedSlots) {
              setPendingSaveDraft({
                name: name.trim() || t('storeNew.unnamed'),
                latitude: latitude as number,
                longitude: longitude as number,
                note: note.trim() || undefined,
                url: url.trim() || undefined,
              });
              setPaywallVisible(true);
              return;
            }
            try {
              setSaving(true);
              const storeName = name.trim() || t('storeNew.unnamed');
              const created = await addStore({
                name: storeName,
                latitude: latitude as number,
                longitude: longitude as number,
                note: note.trim() || undefined,
                url: url.trim() || undefined,
              });
              if (photoUri && created?.id) {
                await updateStore(created.id, { photoUri, photoUris: [photoUri] });
              }
              logStoreRegistered({ store_name: storeName });
              const badgeShown = await checkAndShowBadge(latitude as number, longitude as number);
              if (badgeShown) {
                setGoBackAfterBadge(true);
              } else {
                await maybeShowInterstitial(isPremiumUser);
                router.back();
              }
            } catch (e: any) {
              Alert.alert(t('common.saveFailed'), e?.message ?? t('common.tryAgain'));
            } finally {
              setSaving(false);
            }
          }}
          style={{
            ...UI.primaryBtn,
            backgroundColor: canSave ? colors.primary : colors.chipBg,
          }}>
          <Text style={{ color: canSave ? 'white' : colors.subText, fontFamily: fonts.extraBold }}>
            {t('storeNew.saveButton')}
          </Text>
        </Pressable>
        <Text style={{ textAlign: 'center', color: colors.subText, fontSize: 12, fontFamily: fonts.medium, marginTop: 4 }}>
          {t('storeNew.laterHint')}
        </Text>
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
              style={[UI.primaryCta, { backgroundColor: colors.primary }]}>
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
              style={[UI.adCta, { backgroundColor: !limitState?.canWatchRewardAd ? colors.chipBg : colors.card, shadowColor: colors.shadowDark }]}>
              <Text style={[UI.adCtaText, { color: colors.text }]}>{t('storeNew.rewardCta')}</Text>
            </Pressable>
            {!limitState?.canWatchRewardAd ? <Text style={[UI.adUsedText, { color: colors.subText }]}>{t('storeNew.rewardUsed')}</Text> : null}
            <Text style={[UI.assureText, { color: colors.subText }]}>{t('storeNew.assureKeep')}</Text>
            <Text style={[UI.assureText, { color: colors.subText }]}>{t('storeNew.assureRestore')}</Text>
            <Pressable
              onPress={() => setPaywallVisible(false)}
              disabled={isProcessingUnlock}
              style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontFamily: fonts.extraBold }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <PremiumPaywall
        visible={premiumPaywallVisible}
        onClose={() => {
          setPremiumPaywallVisible(false);
          // Soft-block: dismiss → continue saving if postLimit not reached
          const draft = pendingSaveDraft;
          if (draft) {
            setPendingSaveDraft(null);
            (async () => {
              try {
                setSaving(true);
                const created = await addStore(draft);
                if (photoUri && created?.id) {
                  await updateStore(created.id, { photoUri, photoUris: [photoUri] });
                }
                logStoreRegistered({ store_name: draft.name });
                const badgeShown = await checkAndShowBadge(draft.latitude, draft.longitude);
                if (badgeShown) {
                  setGoBackAfterBadge(true);
                } else {
                  router.back();
                }
              } catch (e: any) {
                Alert.alert(t('common.saveFailed'), e?.message ?? t('common.tryAgain'));
              } finally {
                setSaving(false);
              }
            })();
          }
        }}
        onPurchased={() => {
          const draft = pendingSaveDraft;
          if (draft) {
            setPendingSaveDraft(null);
            autoSavePending(t('storeNew.purchaseSuccess'));
          }
        }}
        trigger={premiumPaywallTrigger}
      />
      <BadgeCelebrationModal
        visible={badgeCelebrationVisible}
        badge={celebrationBadge}
        prefName={celebrationPrefName}
        earnedCount={celebrationCount}
        isPurchased={badgeCollectionPurchased}
        onClose={() => {
          setBadgeCelebrationVisible(false);
          if (goBackAfterBadge) {
            setGoBackAfterBadge(false);
            router.back();
          }
        }}
      />
      <MilestoneShareModal
        visible={milestoneVisible}
        milestoneType={milestoneType}
        visitedCount={milestoneVisited}
        storeCount={milestoneStoreCount}
        onClose={() => {
          setMilestoneVisible(false);
          if (goBackAfterBadge) {
            setGoBackAfterBadge(false);
            router.back();
          }
        }}
      />
      {toastMessage ? (
        <View style={UI.toast}>
          <Text style={UI.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}
