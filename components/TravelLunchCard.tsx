import React, { useEffect } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type PressableProps,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

type Props = {
  iconSource: ImageSourcePropType;
  visitedCount: number;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onPress: PressableProps['onPress'];
  onAdd: PressableProps['onPress'];
};

export function TravelLunchCard({
  iconSource,
  visitedCount,
  title,
  subtitle,
  ctaLabel,
  onPress,
  onAdd,
}: Props) {
  const colors = useThemeColors();
  const progressRatio = Math.min(Math.max(visitedCount / 47, 0), 1);
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(progressRatio * 100, { duration: 800 });
  }, [progressRatio, animatedWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <NeuCard style={[styles.card, { backgroundColor: colors.card }]}>
      <Pressable onPress={onPress}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Image source={iconSource} style={styles.icon} resizeMode="cover" />
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.progress, { color: colors.subText }]}>{visitedCount}/47</Text>
        </View>
        <Text style={[styles.sub, { color: colors.subText }]} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.chipBg }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: colors.accent }, progressStyle]} />
        </View>
      </Pressable>
      <View style={styles.linkRow}>
        <Pressable onPress={onPress}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {t('home.viewCollection')} →
          </Text>
        </Pressable>
      </View>
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
    marginBottom: 0,
    padding: 16,
    borderRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    marginRight: 8,
    flex: 1,
  },
  progress: {
    fontSize: 14,
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
  },
  progressBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  linkRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  linkText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
});
