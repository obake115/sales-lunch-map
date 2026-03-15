import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { purchaseFoodBadgeCollection, getFoodBadgePrice, restorePurchases } from '@/src/purchases';
import { setFoodBadgeCollectionPurchased } from '@/src/storage';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
};

export function FoodBadgePaywall({ visible, onClose, onPurchased }: Props) {
  const colors = useThemeColors();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [priceString, setPriceString] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      getFoodBadgePrice().then(setPriceString);
    }
  }, [visible]);

  const handlePurchase = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await purchaseFoodBadgeCollection();
      if (result.success) {
        await setFoodBadgeCollectionPurchased(true);
        onPurchased?.();
        onClose();
      } else if (!result.cancelled && result.message) {
        Alert.alert('', result.message);
      }
    } catch {
      Alert.alert('', t('purchases.failed'));
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, onPurchased, onClose]);

  const handleRestore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        await setFoodBadgeCollectionPurchased(true);
        onPurchased?.();
        onClose();
      } else if (result.message) {
        Alert.alert('', result.message);
      }
    } catch {
      Alert.alert('', t('purchases.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  }, [restoring, onPurchased, onClose]);

  const displayPrice = priceString ?? '¥480';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <NeuCard style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🍽</Text>
          <Text style={{
            fontSize: 20,
            fontFamily: fonts.extraBold,
            color: colors.text,
            textAlign: 'center',
            marginBottom: 8,
          }}>{t('foodBadges.paywallTitle')}</Text>

          <Text style={{
            fontSize: 14,
            fontFamily: fonts.medium,
            color: colors.subText,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 20,
          }}>{t('foodBadges.paywallBody')}</Text>

          <Text style={{
            fontSize: 32,
            fontFamily: fonts.extraBold,
            color: colors.accent,
            marginBottom: 4,
          }}>{displayPrice}</Text>

          <Text style={{
            fontSize: 12,
            fontFamily: fonts.medium,
            color: colors.subText,
            marginBottom: 20,
          }}>{t('foodBadges.paywallOnetime')}</Text>

          <Pressable
            onPress={handlePurchase}
            disabled={purchasing}
            style={{
              width: '100%',
              backgroundColor: colors.primary,
              paddingVertical: 14,
              borderRadius: 28,
              alignItems: 'center',
              opacity: purchasing ? 0.6 : 1,
              marginBottom: 12,
            }}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={{ color: 'white', fontFamily: fonts.extraBold, fontSize: 16 }}>
                {t('foodBadges.unlockButton')}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            style={{ paddingVertical: 8, marginBottom: 4 }}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={colors.subText} />
            ) : (
              <Text style={{
                fontSize: 13,
                fontFamily: fonts.medium,
                color: colors.subText,
              }}>{t('storeNew.restore')}</Text>
            )}
          </Pressable>

          <Pressable onPress={onClose} style={{ paddingVertical: 8 }}>
            <Text style={{
              fontSize: 13,
              fontFamily: fonts.medium,
              color: colors.subText,
            }}>{t('common.close')}</Text>
          </Pressable>
        </NeuCard>
      </View>
    </Modal>
  );
}
