import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { fonts } from '@/src/ui/fonts';
import { t } from '../i18n';
import { getAvailablePackages, purchasePackage, restorePurchases, type PlanPackage } from '../purchases';
import { usePremium } from '../state/PremiumContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { logPaywallShown, logPaywallDismissed } from '../analytics';
import { recordPaywallShown, recordPaywallDismissed } from '../paywallTrigger';
import { GradientBox } from './GradientBox';

// ─── Types ───────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
  trigger?: string;
};

type PlanType = 'monthly' | 'annual' | 'lifetime';

// ─── Helpers ─────────────────────────────────────
function classifyPackage(pkg: PlanPackage): PlanType | null {
  const id = pkg.identifier?.toUpperCase() ?? '';
  const type = pkg.packageType?.toUpperCase() ?? '';
  if (type === 'MONTHLY' || id.includes('MONTHLY') || id.includes('MONTH')) return 'monthly';
  if (type === 'ANNUAL' || id.includes('ANNUAL') || id.includes('YEARLY') || id.includes('YEAR')) return 'annual';
  if (type === 'LIFETIME' || id.includes('LIFETIME') || id.includes('UNLIMITED')) return 'lifetime';
  return null;
}

const FALLBACK_PRICES: Record<PlanType, { price: number; label: string }> = {
  monthly:  { price: 480,  label: '¥480/月' },
  annual:   { price: 4200, label: '¥4,200/年' },
  lifetime: { price: 7800, label: '¥7,800' },
};

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Sub-components ──────────────────────────────

function BenefitCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  const colors = useThemeColors();
  return (
    <View style={[UI.benefitCard, { backgroundColor: colors.inputBg }]}>
      <Text style={UI.benefitIcon}>{icon}</Text>
      <View style={UI.benefitTextWrap}>
        <Text style={[UI.benefitTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[UI.benefitBody, { color: colors.subText }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────

export function PremiumPaywall({ visible, onClose, onPurchased, trigger = 'manual' }: Props) {
  const { refreshPremium } = usePremium();
  const router = useRouter();
  const colors = useThemeColors();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [packages, setPackages] = useState<Map<PlanType, PlanPackage>>(new Map());
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // CTA press animation
  const ctaScale = useSharedValue(1);
  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  // Annual card entrance micro-animation
  const annualScale = useSharedValue(1);
  const annualAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: annualScale.value }],
  }));

  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;

  // Debug log on mount
  const debugLogged = useRef(false);
  useEffect(() => {
    if (visible && !debugLogged.current) {
      debugLogged.current = true;
      console.log(
        `[Paywall] visible=true, appOwnership=${Constants.appOwnership}, platform=${Platform.OS}, trigger=${triggerRef.current}`,
      );
    }
    if (!visible) debugLogged.current = false;
  }, [visible]);

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    setLoadError(false);
    setDebugInfo(null);
    try {
      const pkgs = await getAvailablePackages();
      const classified = pkgs.map(p => ({
        id: p.identifier,
        type: p.packageType,
        plan: classifyPackage(p),
        productId: p._raw?.product?.identifier ?? '?',
      }));
      console.log('[Paywall] loadPackages: %d packages:', pkgs.length, classified);

      const map = new Map<PlanType, PlanPackage>();
      for (const pkg of pkgs) {
        const planType = classifyPackage(pkg);
        if (planType) map.set(planType, pkg);
      }
      console.log('[Paywall] mapped plans: [%s]', [...map.keys()].join(', '));
      setPackages(map);

      // __DEV__ 時のみ画面にデバッグ情報を表示
      if (__DEV__) {
        setDebugInfo(
          pkgs.length === 0
            ? 'packages: 0 (offerings empty)'
            : classified.map(c => `${c.plan ?? '?'}: ${c.id} → ${c.productId}`).join('\n'),
        );
      }

      if (pkgs.length === 0) {
        console.warn('[Paywall] 0 packages — showing error state');
        setLoadError(true);
      }
    } catch (e) {
      console.error('[Paywall] loadPackages error:', e);
      setLoadError(true);
      if (__DEV__) setDebugInfo(`Error: ${e}`);
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadPackages();
      setSelectedPlan('annual');
      recordPaywallShown();
      logPaywallShown({ trigger: triggerRef.current });

      // Annual card micro-animation: 0.98 → 1.03 → 1.0
      annualScale.value = 0.98;
      annualScale.value = withSequence(
        withTiming(1.03, { duration: 150 }),
        withTiming(1.0, { duration: 100 }),
      );
    }
  }, [visible, loadPackages]);

  // Dynamic annual metrics
  const annualMetrics = useMemo(() => {
    const monthlyPrice = packages.get('monthly')?.product?.price ?? FALLBACK_PRICES.monthly.price;
    const annualPrice = packages.get('annual')?.product?.price ?? FALLBACK_PRICES.annual.price;
    const fullYear = monthlyPrice * 12;
    const offPercent = Math.round(((fullYear - annualPrice) / fullYear) * 100);
    const monthlyEquiv = Math.round(annualPrice / 12);
    const saving = fullYear - annualPrice;
    return { offPercent, monthlyEquiv, saving, monthlyPrice };
  }, [packages]);

  // Dynamic CTA label based on selected plan
  const ctaLabel = useMemo(() => {
    switch (selectedPlan) {
      case 'annual': return t('paywall.ctaAnnual');
      case 'monthly': return t('paywall.ctaMonthly');
      case 'lifetime': return t('paywall.ctaLifetime');
    }
  }, [selectedPlan]);

  const handlePurchase = async () => {
    if (purchasing) return;
    const pkg = packages.get(selectedPlan);

    // ── 詳細ログ: 選択プランとpackage情報 ──
    console.log('[Paywall] handlePurchase pressed:', {
      selectedPlan,
      pkgIdentifier: pkg?.identifier ?? 'null',
      pkgProductId: pkg?._raw?.product?.identifier ?? 'null',
      packagesKeys: [...packages.keys()],
      packagesSize: packages.size,
    });

    if (!pkg) {
      console.warn('[Paywall] handlePurchase: package not found for plan=%s, packages.size=%d', selectedPlan, packages.size);
      Alert.alert('', t('purchases.packageUnavailable'));
      return;
    }

    // ── _raw の存在チェック ──
    if (!pkg._raw) {
      console.error('[Paywall] handlePurchase: pkg._raw is null/undefined', { identifier: pkg.identifier });
      Alert.alert('', t('purchases.packageInvalid'));
      return;
    }

    setPurchasing(true);
    try {
      console.log('[Paywall] calling purchasePackage:', {
        identifier: pkg.identifier,
        rawIdentifier: pkg._raw?.identifier,
        rawProductId: pkg._raw?.product?.identifier,
      });
      const result = await purchasePackage(pkg);
      console.log('[Paywall] purchasePackage result:', { success: result.success, cancelled: result.cancelled, message: result.message });
      if (result.success) {
        await refreshPremium();
        onPurchased?.();
        onClose();
      } else if (!result.cancelled && result.message) {
        Alert.alert(t('storeNew.purchaseFailed'), result.message);
      }
    } catch (e: any) {
      console.error('[Paywall] handlePurchase exception:', e?.message ?? e);
      Alert.alert(t('storeNew.purchaseFailed'));
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        await refreshPremium();
        onPurchased?.();
        onClose();
      } else if (result.message) {
        Alert.alert(t('storeNew.restoreFailed'), result.message);
      }
    } catch {
      Alert.alert(t('storeNew.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  };

  const handleClose = () => {
    recordPaywallDismissed();
    logPaywallDismissed({ trigger: triggerRef.current });
    onClose();
  };

  const getPlanPrice = (planType: PlanType) => {
    const pkg = packages.get(planType);
    const fb = FALLBACK_PRICES[planType];
    return pkg?.priceString || fb.label;
  };

  const hasLifetime = packages.size === 0 || packages.has('lifetime');
  const ctaDisabled = purchasing || loadingPackages || loadError;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[UI.container, { backgroundColor: colors.bg }]}>
        {/* ── Header ── */}
        <View style={UI.header}>
          <Pressable onPress={handleClose} style={[UI.closeBtn, { backgroundColor: colors.border }]} hitSlop={12}>
            <Text style={[UI.closeBtnText, { color: colors.subText }]}>✕</Text>
          </Pressable>
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={UI.restoreBtn}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Text style={UI.restoreBtnText}>{t('storeNew.restore')}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={UI.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero Title ── */}
          <View style={UI.heroSection}>
            <Text style={UI.heroEmoji}>✨</Text>
            <Text style={[UI.title, { color: colors.text }]}>{t('paywall.title')}</Text>
            <Text style={[UI.subtitle, { color: colors.subText }]}>{t('paywall.subtitle')}</Text>
          </View>

          {/* ── Benefits ── */}
          <View style={UI.benefits}>
            <BenefitCard
              icon="🗺"
              title={t('paywall.feature1Title').replace(/^🗺\s*/, '')}
              body={t('paywall.feature1Body')}
            />
            <BenefitCard
              icon="🚫"
              title={t('paywall.feature2Title').replace(/^🚫\s*/, '')}
              body={t('paywall.feature2Body')}
            />
            <BenefitCard
              icon="☁️"
              title={t('paywall.feature3Title').replace(/^☁\s*/, '')}
              body={t('paywall.feature3Body')}
            />
          </View>

          {/* ── Plans ── */}
          {loadingPackages ? (
            <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 24 }} />
          ) : loadError ? (
            <View style={UI.errorBox}>
              <Text style={[UI.errorText, { color: colors.subText }]}>{t('purchases.packageUnavailable')}</Text>
              <Text style={[UI.errorHint, { color: colors.subText }]}>{t('purchases.packageUnavailableHint')}</Text>
              <Pressable onPress={loadPackages} style={UI.retryBtn}>
                <Text style={UI.retryBtnText}>{t('purchases.retry')}</Text>
              </Pressable>
              {debugInfo != null && (
                <Text style={[UI.debugText, { color: colors.subText, backgroundColor: colors.inputBg }]}>{debugInfo}</Text>
              )}
            </View>
          ) : (
            <View style={UI.planList}>
              {/* ── Annual Hero Card (with micro-animation) ── */}
              <Animated.View style={annualAnimStyle}>
                <Pressable
                  onPress={() => setSelectedPlan('annual')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPlan === 'annual' }}
                  style={[
                    UI.annualOuter,
                    selectedPlan === 'annual' && UI.annualOuterSelected,
                  ]}
                >
                  <GradientBox
                    colors={selectedPlan === 'annual' ? ['#4F46E5', '#7C3AED'] : ['#6366F1', '#818CF8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={UI.annualInner}
                  >
                    {/* Best Value badge */}
                    <View style={[UI.bestBadge, { backgroundColor: colors.accentBg }]}>
                      <Text style={[UI.bestBadgeText, { color: colors.accentText }]}>{t('paywall.bestValue')}</Text>
                    </View>

                    {/* OFF badge */}
                    {annualMetrics.offPercent > 0 && (
                      <View style={[UI.offBadge, { backgroundColor: colors.accentBg }]}>
                        <Text style={[UI.offBadgeText, { color: colors.accentText }]}>
                          {t('paywall.planAnnualOff', { percent: annualMetrics.offPercent })}
                        </Text>
                      </View>
                    )}

                    <Text style={UI.annualLabel}>{t('paywall.planAnnual')}</Text>

                    {/* Billed amount — must be the most prominent pricing element */}
                    <Text style={UI.annualPrice}>{getPlanPrice('annual')}</Text>

                    {/* Equiv monthly price (subordinate) */}
                    <Text style={UI.annualEquiv}>
                      {t('paywall.planAnnualEquiv', { monthlyEquiv: annualMetrics.monthlyEquiv.toLocaleString() })}
                    </Text>

                    {/* Saving callout (subordinate) */}
                    {annualMetrics.saving > 0 && (
                      <View style={UI.savingBadge}>
                        <Text style={UI.savingText}>
                          {t('paywall.annualSaving', { saving: annualMetrics.saving.toLocaleString() })}
                        </Text>
                      </View>
                    )}

                    <Text style={UI.annualSocial}>{t('paywall.planAnnualSub')}</Text>

                    {/* Cancel note inside card */}
                    <Text style={UI.annualCancel}>{t('paywall.annualCancelNote')}</Text>
                  </GradientBox>
                </Pressable>
              </Animated.View>

              {/* ── Monthly Card ── */}
              <Pressable
                onPress={() => setSelectedPlan('monthly')}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedPlan === 'monthly' }}
                style={[
                  UI.planCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  selectedPlan === 'monthly' && { borderColor: '#6366F1', borderWidth: 2.5, backgroundColor: colors.inputBg },
                ]}
              >
                <View style={UI.planRadio}>
                  <View style={[UI.radioOuter, { borderColor: colors.border }, selectedPlan === 'monthly' && UI.radioOuterActive]}>
                    {selectedPlan === 'monthly' && <View style={UI.radioInner} />}
                  </View>
                </View>
                <View style={UI.planInfo}>
                  <Text style={[UI.planLabel, { color: colors.text }, selectedPlan === 'monthly' && UI.planLabelActive]}>
                    {t('paywall.planMonthly')}
                  </Text>
                  <Text style={[UI.planSub, { color: colors.subText }]}>{t('paywall.planMonthlySub')}</Text>
                </View>
                <Text style={[UI.planPrice, { color: colors.text }, selectedPlan === 'monthly' && UI.planPriceActive]}>
                  {getPlanPrice('monthly')}
                </Text>
              </Pressable>

              {/* ── Lifetime Card (de-emphasized) ── */}
              {hasLifetime && (
                <Pressable
                  onPress={() => setSelectedPlan('lifetime')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedPlan === 'lifetime' }}
                  style={[
                    UI.lifetimeCard,
                    { borderColor: colors.border, backgroundColor: colors.inputBg },
                    selectedPlan === 'lifetime' && { borderColor: '#6366F1', borderWidth: 2, backgroundColor: colors.inputBg },
                  ]}
                >
                  <View style={UI.planRadio}>
                    <View style={[UI.radioOuter, { borderColor: colors.border }, selectedPlan === 'lifetime' && UI.radioOuterActive]}>
                      {selectedPlan === 'lifetime' && <View style={UI.radioInner} />}
                    </View>
                  </View>
                  <View style={UI.planInfo}>
                    <Text style={[UI.lifetimeLabel, { color: colors.subText }, selectedPlan === 'lifetime' && UI.planLabelActive]}>
                      {t('paywall.planLifetime')}
                    </Text>
                    <Text style={[UI.lifetimeSub, { color: colors.subText }]}>{t('paywall.planLifetimeSub')}</Text>
                  </View>
                  <Text style={[UI.lifetimePrice, { color: colors.subText }, selectedPlan === 'lifetime' && UI.planPriceActive]}>
                    {getPlanPrice('lifetime')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* __DEV__ debug info (本番では非表示) */}
          {__DEV__ && debugInfo != null && !loadError && (
            <Text style={[UI.debugText, { color: colors.subText, backgroundColor: colors.inputBg }]}>{debugInfo}</Text>
          )}

          {/* ── CTA Button (dynamic label) ── */}
          <Animated.View style={[UI.ctaWrap, ctaAnimStyle]}>
            <Pressable
              onPress={handlePurchase}
              disabled={ctaDisabled}
              onPressIn={() => { ctaScale.value = withTiming(0.96, { duration: 80 }); }}
              onPressOut={() => { ctaScale.value = withTiming(1, { duration: 120 }); }}
              accessibilityRole="button"
              style={[UI.ctaOuter, ctaDisabled && { opacity: 0.5 }]}
            >
              <GradientBox
                colors={['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={UI.ctaGradient}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={UI.ctaText}>{ctaLabel}</Text>
                )}
              </GradientBox>
            </Pressable>
          </Animated.View>

          {/* ── Footer ── */}
          <Text style={[UI.cancelNote, { color: colors.subText }]}>{t('paywall.cancelNote')}</Text>

          <View style={UI.footerLinks}>
            <Pressable onPress={() => router.push('/privacy')} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Text style={[UI.footerLink, { color: colors.subText }]}>{t('settings.privacyPolicy')}</Text>
            </Pressable>
            <Text style={[UI.footerSep, { color: colors.border }]}>|</Text>
            <Pressable onPress={() => router.push('/terms')} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Text style={[UI.footerLink, { color: colors.subText }]}>{t('settings.termsOfService')}</Text>
            </Pressable>
            <Text style={[UI.footerSep, { color: colors.border }]}>|</Text>
            <Pressable
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Text style={[UI.footerLink, { color: colors.subText }]}>{t('paywall.manageSubscriptions')}</Text>
            </Pressable>
          </View>

          <Text style={[UI.note, { color: colors.subText }]}>{t('paywall.subscriptionTerms')}</Text>
          <Text style={[UI.note, { color: colors.subText }]}>{t('paywall.subscriptionCancel')}</Text>
          <Text style={[UI.note, { color: colors.subText }]}>{t('paywall.restoreNote')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────

const UI = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  restoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  restoreBtnText: {
    color: '#6366F1',
    fontSize: 14,
    fontFamily: fonts.bold,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // ── Hero Title ──
  heroSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.extraBold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 6,
  },

  // ── Benefits ──
  benefits: {
    gap: 10,
    marginBottom: 22,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  benefitIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: fonts.extraBold,
    marginBottom: 2,
  },
  benefitBody: {
    fontSize: 13,
    fontFamily: fonts.medium,
    lineHeight: 18,
  },

  // ── Plans ──
  planList: {
    gap: 12,
    marginBottom: 22,
  },

  // Annual Hero
  annualOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  annualOuterSelected: {
    transform: [{ scale: 1.02 }],
  },
  annualInner: {
    padding: 20,
    position: 'relative',
  },
  bestBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomRightRadius: 14,
  },
  bestBadgeText: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
  },
  offBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomLeftRadius: 14,
  },
  offBadgeText: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
  },
  annualLabel: {
    fontSize: 16,
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
    marginTop: 18,
    marginBottom: 6,
  },
  annualPrice: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  annualEquiv: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  savingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(253,230,138,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  savingText: {
    fontSize: 13,
    fontFamily: fonts.extraBold,
    color: '#FDE68A',
  },
  annualSocial: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.7)',
  },
  annualCancel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },

  // Standard plan card (monthly)
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
  },
  planRadio: {
    marginRight: 14,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#6366F1',
  },
  radioInner: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#6366F1',
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontSize: 15,
    fontFamily: fonts.extraBold,
  },
  planLabelActive: {
    color: '#4F46E5',
  },
  planSub: {
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 17,
    fontFamily: fonts.extraBold,
    marginLeft: 8,
  },
  planPriceActive: {
    color: '#4F46E5',
  },

  // Lifetime card (de-emphasized)
  lifetimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  lifetimeLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  lifetimeSub: {
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  lifetimePrice: {
    fontSize: 15,
    fontFamily: fonts.bold,
    marginLeft: 8,
  },

  // ── CTA ──
  ctaWrap: {
    marginBottom: 12,
  },
  ctaOuter: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 28,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.3,
  },

  // ── Footer ──
  cancelNote: {
    fontSize: 13,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 14,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textDecorationLine: 'underline',
  },
  footerSep: {
    fontSize: 12,
  },
  note: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 17,
  },

  // Error / retry
  errorBox: {
    alignItems: 'center',
    marginVertical: 24,
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  errorHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 17,
  },
  debugText: {
    fontSize: 10,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
