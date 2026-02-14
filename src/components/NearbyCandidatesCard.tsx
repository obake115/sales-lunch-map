import { Pressable, Text, View } from 'react-native';

import { t } from '@/src/i18n';

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
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  title: {
    fontWeight: '900',
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
    fontWeight: '800',
    color: '#111827',
    flexShrink: 1,
    paddingRight: 8,
  } as const,
  itemMeta: {
    color: '#6B7280',
    fontWeight: '700',
  } as const,
  favorite: {
    marginLeft: 6,
  } as const,
};

export function NearbyCandidatesCard({ radiusM, candidates, onPressItem }: Props) {
  return (
    <View style={UI.card}>
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
    </View>
  );
}
