import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PremiumPaywall } from '@/src/components/PremiumPaywall';
import { t } from '@/src/i18n';
import { usePremium } from '@/src/state/PremiumContext';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#E9E4DA',
  } as const,
  title: {
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
    color: '#111827',
  } as const,
  body: {
    color: '#6B7280',
    lineHeight: 20,
  } as const,
  purchaseBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 8,
  } as const,
  purchaseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  } as const,
  premiumBadge: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 8,
  } as const,
  premiumBadgeText: {
    color: '#065F46',
    fontSize: 16,
    fontWeight: '700',
  } as const,
} as const;

export default function PostLimitInfoScreen() {
  const { isPremium } = usePremium();
  const [paywallVisible, setPaywallVisible] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section1Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section1Body')}</Text>
        </NeuCard>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section2Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section2Body')}</Text>
        </NeuCard>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section3Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section3Body')}</Text>
          {isPremium ? (
            <View style={UI.premiumBadge}>
              <Text style={UI.premiumBadgeText}>{t('paywall.purchasedLabel')}</Text>
            </View>
          ) : (
            <Pressable onPress={() => setPaywallVisible(true)} style={UI.purchaseBtn}>
              <Text style={UI.purchaseBtnText}>{t('paywall.purchaseCta')}</Text>
            </Pressable>
          )}
        </NeuCard>
      </ScrollView>

      <PremiumPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        trigger="postLimitInfo"
      />
    </View>
  );
}
