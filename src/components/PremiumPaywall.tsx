import React, { useState } from 'react';
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

import { t } from '../i18n';
import { purchaseUnlimited, restorePurchases } from '../purchases';
import { usePremium } from '../state/PremiumContext';
import { NeuCard } from '../ui/NeuCard';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
  trigger?: string;
};

export function PremiumPaywall({ visible, onClose, onPurchased }: Props) {
  const { refreshPremium } = usePremium();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await purchaseUnlimited();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
          <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
            {restoring ? (
              <ActivityIndicator size="small" color="#4F78FF" />
            ) : (
              <Text style={styles.restoreBtnText}>{t('storeNew.restore')}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

          <View style={styles.features}>
            <NeuCard style={styles.featureCard}>
              <Text style={styles.featureTitle}>{t('paywall.feature1Title')}</Text>
              <Text style={styles.featureBody}>{t('paywall.feature1Body')}</Text>
            </NeuCard>

            <NeuCard style={styles.featureCard}>
              <Text style={styles.featureTitle}>{t('paywall.feature2Title')}</Text>
              <Text style={styles.featureBody}>{t('paywall.feature2Body')}</Text>
            </NeuCard>

            <NeuCard style={styles.featureCard}>
              <Text style={styles.featureTitle}>{t('paywall.feature3Title')}</Text>
              <Text style={styles.featureBody}>{t('paywall.feature3Body')}</Text>
            </NeuCard>
          </View>

          <Text style={styles.planName}>{t('paywall.planName')}</Text>
          <Text style={styles.price}>{t('paywall.priceLabel')}</Text>

          <Pressable
            onPress={handlePurchase}
            disabled={purchasing}
            style={[styles.purchaseBtn, purchasing && { opacity: 0.6 }]}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.purchaseBtnText}>{t('paywall.purchaseCta')}</Text>
            )}
          </Pressable>

          <Pressable onPress={onClose} style={styles.freeBtn}>
            <Text style={styles.freeBtnText}>{t('paywall.freeContinue')}</Text>
          </Pressable>

          <Text style={styles.note}>{t('storeNew.assureKeep')}</Text>
          <Text style={styles.note}>{t('storeNew.assureRestore')}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9E4DA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D5D0C6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#111',
    fontWeight: '600',
  },
  restoreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  restoreBtnText: {
    color: '#4F78FF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    padding: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  featureBody: {
    fontSize: 13,
    color: '#555',
  },
  planName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 20,
  },
  purchaseBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  freeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  freeBtnText: {
    color: '#888',
    fontSize: 14,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
});
