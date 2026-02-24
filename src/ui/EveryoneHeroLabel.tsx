import { StyleSheet, Text } from 'react-native';

import { t } from '@/src/i18n';

type Props = {
  weatherText?: string;
  postCount: number;
  color?: string;
};

export function EveryoneHeroLabel({ weatherText, postCount, color }: Props) {
  const left = weatherText ? `${weatherText} \u30FB ` : '';
  return (
    <Text style={[styles.sub, color ? { color } : undefined]}>
      {left + t('everyone.heroCount', { count: postCount })}
    </Text>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
});
