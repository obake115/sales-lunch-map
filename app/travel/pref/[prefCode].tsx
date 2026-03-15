import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { SafeImage } from '@/src/ui/SafeImage';
import { t } from '@/src/i18n';
import { deleteTravelLunchEntry, getTravelLunchEntries, toggleTravelLunchFavorite } from '@/src/storage';
import { useThemeColors } from '@/src/state/ThemeContext';
import type { TravelLunchEntry } from '@/src/models';

export default function TravelPrefDetailScreen() {
  const router = useRouter();
  const { prefCode } = useLocalSearchParams<{ prefCode?: string }>();
  const prefectureId = typeof prefCode === 'string' ? prefCode : '';
  const colors = useThemeColors();
  const [entries, setEntries] = useState<TravelLunchEntry[]>([]);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
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
          <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 }]}>
            <SafeImage uri={item.imageUri} style={[styles.cardImage, { backgroundColor: colors.border }]} />
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
              {item.url ? (
                <Pressable onPress={() => Linking.openURL(item.url!)} style={{ marginTop: 4 }}>
                  <Text style={{ color: colors.primary, textDecorationLine: 'underline', fontFamily: fonts.medium, fontSize: 12 }} numberOfLines={1}>
                    {item.url}
                  </Text>
                </Pressable>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Pressable
                  onPress={async () => {
                    await toggleTravelLunchFavorite(item.id);
                    await refresh();
                  }}
                  style={{ padding: 4 }}>
                  <Text style={{ fontSize: 18 }}>{item.isFavorite ? '★' : '☆'}</Text>
                </Pressable>
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
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.dangerBg }}>
                <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold }}>−</Text>
              </Pressable>
              </View>
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
