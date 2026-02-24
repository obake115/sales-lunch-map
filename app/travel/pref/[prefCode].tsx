import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';
import { deleteTravelLunchEntry, getTravelLunchEntries } from '@/src/storage';
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
      background: '#E9E4DA',
      card: '#E9E4DA',
      text: '#111827',
      subText: '#6B7280',
      border: '#D5D0C6',
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
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: '#C8C3B9', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 }]}>
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
              <Pressable
                onPress={() => {
                  Alert.alert(
                    t('collection.deleteTitle'),
                    t('collection.deleteBody', { name: item.restaurantName }),
                    [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('collection.deleteConfirm'),
                        style: 'destructive',
                        onPress: async () => {
                          await deleteTravelLunchEntry(item.id);
                          await refresh();
                        },
                      },
                    ]
                  );
                }}
                style={{ marginTop: 8, alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FEF2F2' }}>
                <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold }}>−</Text>
              </Pressable>
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
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, flex: 1 },
  headerSpacer: { width: 36 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyText: { textAlign: 'center', marginTop: 32 },
  card: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#D5D0C6',
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
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
