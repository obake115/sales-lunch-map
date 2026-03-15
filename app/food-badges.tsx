import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { t } from '@/src/i18n';
import { type FoodBadge, getAllFoodBadges } from '@/src/domain/foodBadges';
import { getVisibleFoodBadges, FREE_BADGE_LIMIT } from '@/src/domain/getVisibleFoodBadges';
import { backfillFoodBadges, getEarnedFoodBadges, isFoodBadgeCollectionPurchased } from '@/src/storage';
import { useThemeColors } from '@/src/state/ThemeContext';
import { FoodBadgePaywall } from '@/src/components/FoodBadgePaywall';
import { FoodBadgeMap } from '@/src/components/FoodBadgeMap';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

export default function FoodBadgesScreen() {
  const colors = useThemeColors();
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [purchased, setPurchased] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<FoodBadge | null>(null);
  const allBadges = getAllFoodBadges();

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        await backfillFoodBadges();
        const [badges, isPurchased] = await Promise.all([
          getEarnedFoodBadges(),
          isFoodBadgeCollectionPurchased(),
        ]);
        if (!mounted) return;
        setEarnedBadges(badges);
        setPurchased(isPurchased);
      })();
      return () => { mounted = false; };
    }, [])
  );

  const { visible, locked } = getVisibleFoodBadges(earnedBadges, purchased);
  const earnedSet = new Set(earnedBadges);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* ── Badge Grid ── */}
        <NeuCard style={{ padding: 14, marginBottom: 16, backgroundColor: colors.card }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }}>
              {t('foodBadges.collectionTitle')}
            </Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.accent }}>
              {earnedBadges.length} <Text style={{ color: colors.subText }}>/ 47</Text>
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 4 }}>
            {allBadges.map((badge) => {
              const isEarned = earnedSet.has(badge.prefId);
              const isVisible = visible.has(badge.prefId);
              const isLocked = locked.has(badge.prefId);

              const content = (
                <View
                  style={{
                    width: '100%',
                    aspectRatio: 0.85,
                    borderRadius: 12,
                    backgroundColor: isVisible
                      ? 'transparent'
                      : colors.chipBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}
                >
                  {isVisible ? (
                    <Image
                      source={badge.imageSource}
                      style={{
                        width: 44,
                        height: 44,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                      }}
                      resizeMode="contain"
                    />
                  ) : isLocked ? (
                    <Text style={{ fontSize: 18 }}>🔒</Text>
                  ) : (
                    <Text style={{ fontSize: 16, color: colors.subText }}>?</Text>
                  )}
                  <Text
                    style={{
                      fontSize: 9,
                      fontFamily: fonts.bold,
                      color: isVisible ? colors.accentText : colors.subText,
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {isVisible
                      ? (t(`prefectures.${badge.prefId}`) as string)
                      : isLocked
                        ? '🔒'
                        : '???'}
                  </Text>
                </View>
              );

              return isVisible ? (
                <Pressable
                  key={badge.prefId}
                  onPress={() => setSelectedBadge(badge)}
                  style={{ width: '17.5%' }}
                >
                  {content}
                </Pressable>
              ) : isLocked ? (
                <Pressable
                  key={badge.prefId}
                  onPress={() => setPaywallVisible(true)}
                  style={{ width: '17.5%' }}
                >
                  {content}
                </Pressable>
              ) : (
                <View key={badge.prefId} style={{ width: '17.5%' }}>
                  {content}
                </View>
              );
            })}
          </View>
        </NeuCard>

        {/* ── Locked badge unlock CTA (only for free users with locked badges) ── */}
        {!purchased && locked.size > 0 && (
          <NeuCard style={{
            padding: 16,
            marginBottom: 16,
            backgroundColor: colors.card,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🔒</Text>
            <Text style={{
              fontSize: 13,
              fontFamily: fonts.medium,
              color: colors.subText,
              textAlign: 'center',
              marginBottom: 12,
            }}>
              {t('foodBadges.lockedBadge')}
            </Text>
            <Pressable
              onPress={() => setPaywallVisible(true)}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 32,
                borderRadius: 28,
              }}
            >
              <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>
                {t('foodBadges.unlockButton')}
              </Text>
            </Pressable>
          </NeuCard>
        )}

      </ScrollView>

      <FoodBadgePaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onPurchased={() => setPurchased(true)}
      />

      {/* ── Badge Detail Modal ── */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setSelectedBadge(null)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 28,
              alignItems: 'center',
              width: 260,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
            }}
          >
            {selectedBadge && (
              <>
                <Image
                  source={selectedBadge.imageSource}
                  style={{ width: 120, height: 120, marginBottom: 16 }}
                  resizeMode="contain"
                />
                <Text style={{
                  fontSize: 20,
                  fontFamily: fonts.extraBold,
                  color: colors.text,
                  marginBottom: 4,
                }}>
                  {t(`prefectures.${selectedBadge.prefId}`) as string}
                </Text>
                <Text style={{
                  fontSize: 15,
                  fontFamily: fonts.medium,
                  color: colors.accent,
                  marginBottom: 16,
                }}>
                  {selectedBadge.foodNameJa}
                </Text>
                <Pressable
                  onPress={() => setSelectedBadge(null)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 32,
                    borderRadius: 20,
                    backgroundColor: colors.chipBg,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontFamily: fonts.bold,
                    color: colors.text,
                  }}>
                    {t('common.close') as string}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
