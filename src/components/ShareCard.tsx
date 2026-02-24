import React, { forwardRef } from 'react';
import { Image, Text, View } from 'react-native';

import { t } from '../i18n';
import type { Store } from '../models';
import { fonts } from '../ui/fonts';

type Props = {
  store: Store;
  isPremium: boolean;
};

const TAG_LABELS: Record<string, string> = {
  'サクッと': 'storeDetail.mood.quick',
  'ゆっくり': 'storeDetail.mood.relaxed',
  '接待向き': 'storeDetail.mood.business',
  '1人OK': 'storeDetail.scene.solo',
  'ご褒美': 'storeDetail.scene.reward',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export const ShareCard = forwardRef<View, Props>(function ShareCard({ store, isPremium }, ref) {
  const tags = [...(store.moodTags ?? []), ...(store.sceneTags ?? [])];
  const photoUri = store.photoUris?.[0] ?? store.photoUri;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: 360,
        backgroundColor: '#FAF7F2',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: 360, height: 200 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ width: 360, height: 120, backgroundColor: '#E9E4DA', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40 }}>🍽️</Text>
        </View>
      )}

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontFamily: fonts.extraBold, color: '#111827', marginBottom: 4 }} numberOfLines={2}>
          {store.name}
        </Text>

        {store.note ? (
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }} numberOfLines={2}>
            {store.note}
          </Text>
        ) : null}

        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {tags.map((tag) => (
              <View key={tag} style={{ backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#1D4ED8' }}>
                  {TAG_LABELS[tag] ? t(TAG_LABELS[tag]) : tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
          {store.timeBand && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>⏱</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', fontFamily: fonts.bold }}>{store.timeBand}{t('shareCard.minutes')}</Text>
            </View>
          )}
          {store.isFavorite && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#F59E0B' }}>⭐</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', fontFamily: fonts.bold }}>{t('shareCard.favorite')}</Text>
            </View>
          )}
          {store.seating && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>🪑</Text>
              <Text style={{ fontSize: 12, color: '#6B7280', fontFamily: fonts.bold }}>
                {store.seating === 'counter' ? t('storeDetail.seatingCounter')
                  : store.seating === 'table' ? t('storeDetail.seatingTable')
                    : t('storeDetail.seatingHorigotatsu')}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 }}>
          <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
            {formatDate(store.createdAt)}
          </Text>
          {!isPremium && (
            <Text style={{ fontSize: 10, fontFamily: fonts.bold, color: '#9CA3AF' }}>
              {t('shareCard.watermark')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});
