import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';
import { getTravelLunchEntries } from '@/src/storage';
import { useThemeColors } from '@/src/state/ThemeContext';

const PREFECTURE_IDS = [
  'hokkaido',
  'aomori',
  'iwate',
  'miyagi',
  'akita',
  'yamagata',
  'fukushima',
  'ibaraki',
  'tochigi',
  'gunma',
  'saitama',
  'chiba',
  'tokyo',
  'kanagawa',
  'niigata',
  'toyama',
  'ishikawa',
  'fukui',
  'yamanashi',
  'nagano',
  'gifu',
  'shizuoka',
  'aichi',
  'mie',
  'shiga',
  'kyoto',
  'osaka',
  'hyogo',
  'nara',
  'wakayama',
  'tottori',
  'shimane',
  'okayama',
  'hiroshima',
  'yamaguchi',
  'tokushima',
  'kagawa',
  'ehime',
  'kochi',
  'fukuoka',
  'saga',
  'nagasaki',
  'kumamoto',
  'oita',
  'miyazaki',
  'kagoshima',
  'okinawa',
];

type RowItem = {
  id: string;
  name: string;
  count: number;
};

export default function TravelPrefListScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [rows, setRows] = useState<RowItem[]>([]);
  const [visitedCount, setVisitedCount] = useState(0);

  const refresh = useCallback(async () => {
    const entries = await getTravelLunchEntries();
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.prefectureId] = (counts[entry.prefectureId] ?? 0) + 1;
    }
    const list = PREFECTURE_IDS.map((id) => ({
      id,
      name: t(`prefectures.${id}`),
      count: counts[id] ?? 0,
    }));
    setRows(list);
    setVisitedCount(Object.keys(counts).length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const progressRatio = Math.min(Math.max(visitedCount / 47, 0), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Text style={[styles.headerBackText, { color: colors.text }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('travel.prefListTitle')}</Text>
        <Text style={[styles.headerProgress, { color: colors.subText }]}>
          {t('travel.prefListProgress', { count: visitedCount })}
        </Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.subText }]}>
          {t('travel.prefListProgress', { count: visitedCount })}
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const hasPosts = item.count > 0;
          return (
            <Pressable
              onPress={() => {
                if (hasPosts) {
                  router.push(`/travel/pref/${item.id}`);
                } else {
                  router.push(`/travel/new?prefecture=${item.id}`);
                }
              }}
              style={[
                styles.row,
                {
                  backgroundColor: hasPosts ? colors.card : colors.chipBg,
                  shadowColor: colors.shadowDark,
                  shadowOffset: { width: 2, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                },
              ]}
            >
              <Text style={[styles.rowTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rowCount, { color: colors.subText }]}>
                {t('travel.prefListCount', { count: item.count })}
              </Text>
              <FontAwesome name="chevron-right" size={14} color={colors.subText} />
            </Pressable>
          );
        }}
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
  headerProgress: { fontSize: 14, fontFamily: fonts.bold },
  progressWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressLabel: {
    marginTop: 6,
    fontSize: 12,
    textAlign: 'right',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  rowTitle: { flex: 1, fontSize: 15, fontFamily: fonts.bold },
  rowCount: { fontSize: 13, marginRight: 8 },
});
