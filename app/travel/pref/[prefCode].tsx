import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { t } from '@/src/i18n';
import { getTravelLunchEntries } from '@/src/storage';
import { useThemeMode } from '@/src/state/ThemeContext';
import type { TravelLunchEntry } from '@/src/models';

export default function TravelPrefDetailScreen() {
  const router = useRouter();
  const { prefCode } = useLocalSearchParams<{ prefCode?: string }>();
  const prefectureId = typeof prefCode === 'string' ? prefCode : '';
  const { themeMode } = useThemeMode();
  const [entries, setEntries] = useState<TravelLunchEntry[]>([]);

  const colors = useMemo(() => {
    if (themeMode === 'navy') {
      return {
        background: '#0F172A',
        card: '#111827',
        text: '#E5E7EB',
        subText: '#9CA3AF',
        border: '#334155',
        accent: '#3B82F6',
      };
    }
    return {
      background: '#FFF8EB',
      card: '#FFFFFF',
      text: '#111827',
      subText: '#6B7280',
      border: '#E5E7EB',
      accent: '#3B82F6',
    };
  }, [themeMode]);

  const prefName = useMemo(() => {
    if (!prefectureId) return t('pref.fallback');
    return t(`prefectures.${prefectureId}`);
  }, [prefectureId]);

  const refresh = useCallback(async () => {
    const list = await getTravelLunchEntries();
    setEntries(list.filter((item) => item.prefectureId === prefectureId));
  }, [prefectureId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={[styles.headerBackText, { color: colors.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{prefName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.subText }]}>{t('travel.prefDetailEmpty')}</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.restaurantName}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.subText }]} numberOfLines={1}>
                {item.genre} | {item.visitedAt}
              </Text>
              <View style={styles.starRow}>
                {Array.from({ length: 5 }).map((_, index) => {
                  const active = item.rating >= index + 1;
                  return (
                    <FontAwesome
                      key={`${item.id}-star-${index}`}
                      name="star"
                      size={14}
                      color={active ? '#F4B740' : colors.border}
                    />
                  );
                })}
              </View>
              {item.memo ? (
                <Text style={[styles.memoText, { color: colors.subText }]} numberOfLines={1}>
                  {item.memo}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerBackText: { fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  headerSpacer: { width: 36 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyText: { textAlign: 'center', marginTop: 32 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    marginBottom: 6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  memoText: {
    fontSize: 12,
  },
});
