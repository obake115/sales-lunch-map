import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type PressableProps,
} from 'react-native';

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
  const progressRatio = Math.min(Math.max(visitedCount / 47, 0), 1);
  return (
    <NeuCard style={styles.card}>
      <Pressable onPress={onPress}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Image source={iconSource} style={styles.icon} resizeMode="cover" />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.progress}>{visitedCount}/47</Text>
        </View>
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </Pressable>
      <Pressable
        onPress={(event) => {
          event?.stopPropagation?.();
          onAdd?.(event);
        }}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </NeuCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#E9E4DA',
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
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
    flex: 1,
  },
  progress: {
    fontSize: 14,
    color: '#6B7280',
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  progressBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D5D0C6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  cta: {
    marginTop: 12,
    height: 44,
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#4F78FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
