import React, { forwardRef } from 'react';
import { Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { FoodBadgeMap } from '@/src/components/FoodBadgeMap';
import { fonts } from '@/src/ui/fonts';

type Props = {
  earnedBadges: string[];
  travelCount?: number;
};

export const FoodBadgeShareCard = forwardRef<View, Props>(function FoodBadgeShareCard({ earnedBadges, travelCount = 0 }, ref) {
  const earnedSet = new Set(earnedBadges);

  return (
    <View
      ref={ref}
      style={{
        backgroundColor: '#E9E4DA',
        borderRadius: 20,
        padding: 20,
        width: 400,
      }}
    >
      {/* Title */}
      <Text style={{
        fontSize: 20,
        fontFamily: fonts.extraBold,
        color: '#111827',
        textAlign: 'center',
        marginBottom: 2,
      }}>{t('foodBadges.shareTitle')}</Text>

      {/* Subtitle */}
      <Text style={{
        fontSize: 13,
        fontFamily: fonts.medium,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 12,
      }}>{t('foodBadges.shareSubtitle')}</Text>

      {/* Japan Map with badges */}
      <View style={{ marginBottom: 12 }}>
        <FoodBadgeMap
          visibleBadges={earnedSet}
          height={360}
          badgeSize={64}
          fillDefault="#D5D0C6"
          fillEarned="#D5D0C6"
          stroke="#FFFFFF"
        />
      </View>

      {/* Progress row */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 8 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{
            fontSize: 28,
            fontFamily: fonts.extraBold,
            color: '#F59E0B',
          }}>{earnedBadges.length}<Text style={{ fontSize: 14, color: '#9CA3AF' }}> / 47</Text></Text>
          <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#6B7280' }}>
            {t('foodBadges.homeTitle')}
          </Text>
        </View>
        {travelCount > 0 && (
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 28,
              fontFamily: fonts.extraBold,
              color: '#EC4899',
            }}>{travelCount}<Text style={{ fontSize: 14, color: '#9CA3AF' }}> / 47</Text></Text>
            <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#6B7280' }}>
              {t('home.collectionTitle')}
            </Text>
          </View>
        )}
      </View>

      {/* Watermark */}
      <Text style={{
        fontSize: 12,
        fontFamily: fonts.bold,
        color: '#9CA3AF',
        textAlign: 'center',
      }}>{t('foodBadges.shareWatermark')}</Text>
    </View>
  );
});
