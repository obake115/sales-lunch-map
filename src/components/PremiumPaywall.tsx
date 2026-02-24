import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '../i18n';
import { getAvailablePackages, purchasePackage, restorePurchases, type PlanPackage } from '../purchases';
import { usePremium } from '../state/PremiumContext';

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
  monthly: { price: 480, label: '¥480/月' },
  annual: { price: 3200, label: '¥3,200/年' },
  lifetime: { price: 5800, label: '¥5,800' },
};

// ─── Sub-components ──────────────────────────────

function Badge({ label }: { label: string }) {
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>{label}</Text>
    </View>
  );
}

function BenefitCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.benefitCard}>
      <Text style={s.benefitTitle}>{title}</Text>
      <Text style={s.benefitBody}>{body}</Text>
    </View>
  );
}

function PlanOptionRow({
  label,
  sub,
  price,
  selected,
  recommended,
  onPress,
}: {
  label: string;
  sub: string;
  price: string;
  selected: boolean;
  recommended: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        s.planCard,
        recommended && s.planCardRecommended,
        selected && s.planCardSelected,
      ]}
    >
      <View style={s.planRadio}>
        <View style={[s.radioOuter, selected && s.radioOuterSelected]}>
          {selected && <View style={s.radioInner} />}
        </View>
      </View>
      <View style={s.planInfo}>
        <Text style={[s.planLabel, selected && s.planLabelSelected]}>
          {label}
        </Text>
        <Text style={s.planSub}>{sub}</Text>
      </View>
      <Text style={[s.planPrice, selected && s.planPriceSelected]}>
        {price}
      </Text>
      {recommended && <Badge label={t('paywall.bestValue')} />}
    </Pressable>
  );
}

function PrimaryButton({
  label,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[s.purchaseBtn, disabled && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Text style={s.purchaseBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

// ─── Main Component ──────────────────────────────

export function PremiumPaywall({ visible, onClose, onPurchased }: Props) {
  const { refreshPremium } = usePremium();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [packages, setPackages] = useState<Map<PlanType, PlanPackage>>(new Map());
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [lifetimeExpanded, setLifetimeExpanded] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      const pkgs = await getAvailablePackages();
      const map = new Map<PlanType, PlanPackage>();
      for (const pkg of pkgs) {
        const planType = classifyPackage(pkg);
        if (planType) map.set(planType, pkg);
      }
      setPackages(map);
    } catch {
      // ignore
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadPackages();
      setSelectedPlan('annual');
      setLifetimeExpanded(false);
    }
  }, [visible, loadPackages]);

  // Compute savings amount
  const savingsText = useMemo(() => {
    const monthlyPkg = packages.get('monthly');
    const annualPkg = packages.get('annual');
    const monthlyPrice = monthlyPkg?.product?.price ?? FALLBACK_PRICES.monthly.price;
    const annualPrice = annualPkg?.product?.price ?? FALLBACK_PRICES.annual.price;
    const saveAmount = Math.round(monthlyPrice * 12 - annualPrice);
    if (saveAmount > 0) {
      return t('paywall.planAnnualSave', { amount: saveAmount.toLocaleString() });
    }
    return t('paywall.planAnnualSub');
  }, [packages]);

  const handlePurchase = async () => {
    if (purchasing) return;
    const pkg = packages.get(selectedPlan);
    if (!pkg) {
      Alert.alert(t('purchases.packageMissing'));
      return;
    }
    setPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success) {
        await refreshPremium();
        onPurchased?.();
        onClose();
      } else if (!result.cancelled && result.message) {
        Alert.alert(t('storeNew.purchaseFailed'), result.message);
      }
    } catch {
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

  const getPlanDisplay = (planType: PlanType) => {
    const pkg = packages.get(planType);
    const fb = FALLBACK_PRICES[planType];
    return {
      price: pkg?.priceString || fb.label,
    };
  };

  const hasLifetime = packages.size === 0 || packages.has('lifetime');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>×</Text>
          </Pressable>
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            style={s.restoreBtn}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="#4F78FF" />
            ) : (
              <Text style={s.restoreBtnText}>{t('storeNew.restore')}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── Title ── */}
          <Text style={s.title}>{t('paywall.title')}</Text>
          <Text style={s.subtitle}>{t('paywall.subtitle')}</Text>

          {/* ── Benefits ── */}
          <View style={s.benefits}>
            <BenefitCard title={t('paywall.feature1Title')} body={t('paywall.feature1Body')} />
            <BenefitCard title={t('paywall.feature2Title')} body={t('paywall.feature2Body')} />
            <BenefitCard title={t('paywall.feature3Title')} body={t('paywall.feature3Body')} />
          </View>

          {/* ── Plans ── */}
          {loadingPackages ? (
            <ActivityIndicator size="small" color="#4F78FF" style={{ marginBottom: 20 }} />
          ) : (
            <View style={s.planList}>
              {/* Annual — recommended */}
              <PlanOptionRow
                label={t('paywall.planAnnual')}
                sub={savingsText}
                price={getPlanDisplay('annual').price}
                selected={selectedPlan === 'annual'}
                recommended
                onPress={() => setSelectedPlan('annual')}
              />
              {/* Monthly */}
              <PlanOptionRow
                label={t('paywall.planMonthly')}
                sub={t('paywall.planMonthlySub')}
                price={getPlanDisplay('monthly').price}
                selected={selectedPlan === 'monthly'}
                recommended={false}
                onPress={() => setSelectedPlan('monthly')}
              />
              {/* Lifetime — collapsible */}
              {hasLifetime && (
                lifetimeExpanded ? (
                  <PlanOptionRow
                    label={t('paywall.planLifetime')}
                    sub={t('paywall.planLifetimeSub')}
                    price={getPlanDisplay('lifetime').price}
                    selected={selectedPlan === 'lifetime'}
                    recommended={false}
                    onPress={() => setSelectedPlan('lifetime')}
                  />
                ) : (
                  <Pressable
                    onPress={() => setLifetimeExpanded(true)}
                    style={s.lifetimeToggle}
                  >
                    <Text style={s.lifetimeToggleText}>{t('paywall.planLifetime')}</Text>
                    <Text style={s.lifetimeToggleChevron}>▾</Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          {/* ── CTA ── */}
          <PrimaryButton
            label={t('paywall.purchaseCta')}
            loading={purchasing}
            disabled={purchasing || loadingPackages}
            onPress={handlePurchase}
          />

          {/* ── Free continue ── */}
          <Pressable onPress={onClose} style={s.freeBtn}>
            <Text style={s.freeBtnText}>{t('paywall.freeContinue')}</Text>
          </Pressable>

          {/* ── Notes ── */}
          <Text style={s.note}>{t('paywall.subscriptionNote')}</Text>
          <Text style={s.note}>{t('paywall.restoreNote')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },

  // Header
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
    backgroundColor: '#E8E3D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#111',
    fontFamily: fonts.bold,
  },
  restoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  restoreBtnText: {
    color: '#4F78FF',
    fontSize: 14,
    fontFamily: fonts.bold,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 44,
  },

  // Title
  title: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },

  // Benefits
  benefits: {
    gap: 10,
    marginBottom: 18,
  },
  benefitCard: {
    backgroundColor: '#6B7F99',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#4A5568',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  benefitBody: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#E2E8F0',
  },

  // Plans
  planList: {
    gap: 10,
    marginBottom: 18,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D5D0C6',
    backgroundColor: '#F5F0E8',
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardRecommended: {
    backgroundColor: '#F0F4FF',
    borderColor: '#B8C9FF',
  },
  planCardSelected: {
    borderColor: '#4F78FF',
    borderWidth: 2.5,
  },
  planRadio: {
    marginRight: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C5C0B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4F78FF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F78FF',
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontSize: 15,
    fontFamily: fonts.extraBold,
    color: '#1F2937',
  },
  planLabelSelected: {
    color: '#3B63E0',
  },
  planSub: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#6B7280',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontFamily: fonts.extraBold,
    color: '#1F2937',
    marginLeft: 8,
  },
  planPriceSelected: {
    color: '#3B63E0',
  },

  // Badge
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
    color: '#FFF',
  },

  // Lifetime toggle
  lifetimeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  lifetimeToggleText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: '#9CA3AF',
  },
  lifetimeToggleChevron: {
    fontSize: 13,
    color: '#9CA3AF',
  },

  // CTA
  purchaseBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#4F78FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  purchaseBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: fonts.extraBold,
  },

  // Free continue
  freeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  freeBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: fonts.medium,
    opacity: 0.8,
  },

  // Notes
  note: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
});
