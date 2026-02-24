import { useEffect } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

type Props = {
  visible: boolean;
  streak: number;
  totalDays: number;
  onClose: () => void;
};

export function LoginBonusModal({ visible, streak, totalDays, onClose }: Props) {
  const colors = useThemeColors();
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      badgeScale.value = 0;
      badgeScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 150 }));
    }
  }, [visible, badgeScale]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const nextStreakTarget = 7;
  const remaining = Math.max(0, nextStreakTarget - streak);
  const showNext = remaining > 0;

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
          padding: 18,
        }}>
          <Text style={{
            fontSize: 20,
            fontFamily: fonts.extraBold,
            color: colors.text,
            marginBottom: 6,
            textAlign: 'center',
          }}>{t('loginBonus.title')}</Text>
          <Text style={{
            textAlign: 'center',
            color: colors.subText,
            marginBottom: 12,
          }}>{t('loginBonus.subtitle')}</Text>
          <Animated.View style={[{
            alignSelf: 'center',
            backgroundColor: '#FDE68A',
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 8,
            marginBottom: 10,
          }, badgeAnimStyle]}>
            <Text style={{
              fontFamily: fonts.extraBold,
              color: '#92400E',
            }}>{t('loginBonus.badge')}</Text>
          </Animated.View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.subText }}>{t('loginBonus.streakLabel')}</Text>
            <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('profile.countDays', { count: streak })}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.subText }}>{t('loginBonus.totalLabel')}</Text>
            <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('profile.countDays', { count: totalDays })}</Text>
          </View>
          {showNext && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: colors.subText }}>{t('loginBonus.nextLabel')}</Text>
              <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('loginBonus.remaining', { count: remaining })}</Text>
            </View>
          )}
          <Pressable onPress={onClose} style={{
            marginTop: 12,
            backgroundColor: '#4F78FF',
            paddingVertical: 12,
            borderRadius: 28,
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('common.ok')}</Text>
          </Pressable>
        </NeuCard>
      </View>
    </Modal>
  );
}
