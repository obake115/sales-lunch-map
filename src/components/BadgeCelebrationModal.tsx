import { useEffect, useRef } from 'react';
import { Image, Modal, Platform, Pressable, Share, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';

import { t } from '@/src/i18n';
import { FREE_BADGE_LIMIT } from '@/src/domain/getVisibleFoodBadges';
import { captureAndShare } from '@/src/shareCardCapture';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';
import type { FoodBadge } from '@/src/domain/foodBadges';

type Props = {
  visible: boolean;
  badge: FoodBadge | null;
  prefName: string;
  earnedCount: number;
  /** Whether the food badge collection has been purchased */
  isPurchased?: boolean;
  onClose: () => void;
};

export function BadgeCelebrationModal({ visible, badge, prefName, earnedCount, isPurchased = false, onClose }: Props) {
  const colors = useThemeColors();
  const badgeScale = useSharedValue(0);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    if (visible) {
      badgeScale.value = 0;
      badgeScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));
    }
  }, [visible, badgeScale]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (!badge) return null;

  // Show locked hint when free user earns 6th+ badge
  const showLockedHint = !isPurchased && earnedCount > FREE_BADGE_LIMIT;

  const shareMessage = `${prefName}の${badge.foodNameJa}バッジ獲得！${earnedCount}/47 #LunchMap\nhttps://apps.apple.com/jp/app/%E3%83%A9%E3%83%B3%E3%83%81%E3%83%9E%E3%83%83%E3%83%97-lunchmap/id6758890590`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <View ref={cardRef} collapsable={false}>
          <NeuCard style={{
            width: 320,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 18,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 20,
              fontFamily: fonts.extraBold,
              color: colors.text,
              marginBottom: 6,
              textAlign: 'center',
            }}>{t('foodBadges.celebrationTitle')}</Text>

            <Animated.View style={[{
              width: 160,
              height: 160,
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 16,
            }, badgeAnimStyle]}>
              <Image
                source={badge.imageSource}
                style={{
                  width: 150,
                  height: 150,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                }}
                resizeMode="contain"
              />
            </Animated.View>

            <Text style={{
              fontSize: 18,
              fontFamily: fonts.extraBold,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 4,
            }}>{prefName}</Text>

            <Text style={{
              fontSize: 16,
              fontFamily: fonts.bold,
              color: colors.accent,
              textAlign: 'center',
              marginBottom: 12,
            }}>{badge.foodNameJa}</Text>

            <Text style={{
              fontSize: 15,
              fontFamily: fonts.bold,
              color: colors.subText,
              textAlign: 'center',
              marginBottom: 16,
            }}>{t('foodBadges.celebrationProgress', { count: earnedCount })}</Text>

            <Text style={{
              fontSize: 11,
              fontFamily: fonts.bold,
              color: colors.subText,
              textAlign: 'center',
              marginBottom: 4,
            }}>#LunchMap</Text>
          </NeuCard>
        </View>

        {/* Locked hint — outside the capture area */}
        {showLockedHint && (
          <Text style={{
            fontSize: 12,
            fontFamily: fonts.medium,
            color: colors.accent,
            textAlign: 'center',
            marginTop: 10,
          }}>{t('foodBadges.celebrationLockedHint')}</Text>
        )}

        {/* Buttons outside the capture area */}
        <View style={{ width: 320, marginTop: 12, gap: 10 }}>
          <Pressable
            onPress={() => captureAndShare(cardRef.current, shareMessage)}
            style={{
              width: '100%',
              backgroundColor: colors.pink,
              paddingVertical: 12,
              borderRadius: 28,
              alignItems: 'center',
            }}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>📸 {t('foodBadges.shareButton')}</Text>
          </Pressable>

          <Pressable onPress={onClose} style={{
            width: '100%',
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 28,
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('common.ok')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
