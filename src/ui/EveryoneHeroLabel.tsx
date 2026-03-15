import { StyleSheet, Text } from 'react-native';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';

type Props = {
  weatherText?: string;
  postCount: number;
  color?: string;
};

export function EveryoneHeroLabel({ weatherText, postCount, color }: Props) {
  const colors = useThemeColors();
  const left = weatherText ? `${weatherText} \u30FB ` : '';
  return (
    <Text style={[styles.sub, { color: color ?? colors.subText }]}>
      {left + t('everyone.heroCount', { count: postCount })}
    </Text>
  );
}

const styles = StyleSheet.create({
  sub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
