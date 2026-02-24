import { Pressable, Text, View } from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';
import { NeuCard } from '@/src/ui/NeuCard';

type Candidate = {
  id: string;
  name: string;
  minutes: number;
  distanceM: number;
  isFavorite: boolean;
};

type Props = {
  radiusM: number;
  candidates: Candidate[];
  onPressItem?: (id: string) => void;
};

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
  } as const,
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    marginBottom: 8,
    color: '#111827',
  } as const,
  empty: {
    color: '#6B7280',
  } as const,
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  } as const,
  itemName: {
    fontFamily: fonts.extraBold,
    color: '#111827',
    flexShrink: 1,
    paddingRight: 8,
  } as const,
  itemMeta: {
    color: '#6B7280',
    fontFamily: fonts.bold,
  } as const,
  favorite: {
    marginLeft: 6,
  } as const,
};

export function NearbyCandidatesCard({ radiusM, candidates, onPressItem }: Props) {
  return (
    <NeuCard style={UI.card}>
      <Text style={UI.title}>{t('nearby.title', { radius: radiusM })}</Text>
      {candidates.length === 0 ? (
        <Text style={UI.empty}>{t('nearby.empty')}</Text>
      ) : (
        candidates.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onPressItem?.(item.id)}
            style={UI.itemRow}>
            <Text numberOfLines={1} style={UI.itemName}>
              {item.name}
              {item.isFavorite ? <Text style={UI.favorite}>⭐</Text> : null}
            </Text>
            <Text style={UI.itemMeta}>{t('nearby.walkMinutes', { minutes: item.minutes })}</Text>
          </Pressable>
        ))
      )}
    </NeuCard>
  );
}
