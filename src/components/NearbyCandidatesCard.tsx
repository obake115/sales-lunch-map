import { Pressable, Text, View } from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
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
  } as const,
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    marginBottom: 8,
  } as const,
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  } as const,
  itemName: {
    fontFamily: fonts.extraBold,
    flexShrink: 1,
    paddingRight: 8,
  } as const,
  itemMeta: {
    fontFamily: fonts.bold,
  } as const,
  favorite: {
    marginLeft: 6,
  } as const,
};

export function NearbyCandidatesCard({ radiusM, candidates, onPressItem }: Props) {
  const colors = useThemeColors();
  return (
    <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
      <Text style={[UI.title, { color: colors.text }]}>{t('nearby.title', { radius: radiusM })}</Text>
      {candidates.length === 0 ? (
        <Text style={{ color: colors.subText }}>{t('nearby.empty')}</Text>
      ) : (
        candidates.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onPressItem?.(item.id)}
            style={UI.itemRow}>
            <Text numberOfLines={1} style={[UI.itemName, { color: colors.text }]}>
              {item.name}
              {item.isFavorite ? <Text style={UI.favorite}>⭐</Text> : null}
            </Text>
            <Text style={[UI.itemMeta, { color: colors.subText }]}>{t('nearby.walkMinutes', { minutes: item.minutes })}</Text>
          </Pressable>
        ))
      )}
    </NeuCard>
  );
}
