import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { t } from '@/src/i18n';
import { formatYmd } from '@/src/domain/date';
import { addTravelLunchEntry } from '@/src/storage';
import { useThemeMode } from '@/src/state/ThemeContext';

const GENRES = [
  '和食',
  '洋食',
  '中華',
  '麺類',
  '丼もの',
  '定食',
  'カフェ',
  '郷土料理',
  '軽食',
  'スイーツ',
  'その他',
];

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

export default function TravelLunchNewScreen() {
  const router = useRouter();
  const { themeMode } = useThemeMode();
  const params = useLocalSearchParams<{ prefecture?: string }>();
  const paramPrefecture = typeof params.prefecture === 'string' ? params.prefecture : undefined;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [prefectureId, setPrefectureId] = useState<string | null>(paramPrefecture ?? null);
  const [restaurantName, setRestaurantName] = useState('');
  const [genre, setGenre] = useState<string>('');
  const [visitedDate, setVisitedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showPrefectureModal, setShowPrefectureModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = useMemo(() => {
    if (themeMode === 'navy') {
      return {
        background: '#0F172A',
        card: '#111827',
        text: '#E5E7EB',
        subText: '#9CA3AF',
        border: '#374151',
        accent: '#2E5CE6',
        chip: '#1F2937',
      };
    }
    return {
      background: '#FFF8EB',
      card: '#F7F5F0',
      text: '#111',
      subText: '#666',
      border: '#D6D0C6',
      accent: '#2E5CE6',
      chip: '#EAE6DF',
    };
  }, [themeMode]);

  useEffect(() => {
    if (paramPrefecture) setPrefectureId(paramPrefecture);
  }, [paramPrefecture]);

  const prefectureLabel = useMemo(() => {
    if (!prefectureId) return t('travel.prefectureEmpty');
    const localized = t(`prefectures.${prefectureId}`);
    return localized.startsWith('prefectures.') ? prefectureId : localized;
  }, [prefectureId]);

  const visitedLabel = useMemo(() => formatYmd(visitedDate), [visitedDate]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('travel.photoPermissionTitle'), t('travel.photoPermissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (!imageUri) {
      Alert.alert(t('travel.validationTitle'), t('travel.validationPhoto'));
      return;
    }
    if (!prefectureId) {
      Alert.alert(t('travel.validationTitle'), t('travel.validationPrefecture'));
      return;
    }
    if (!restaurantName.trim()) {
      Alert.alert(t('travel.validationTitle'), t('travel.validationRestaurant'));
      return;
    }
    if (!genre) {
      Alert.alert(t('travel.validationTitle'), t('travel.validationGenre'));
      return;
    }
    if (!rating) {
      Alert.alert(t('travel.validationTitle'), t('travel.validationRating'));
      return;
    }
    setSaving(true);
    try {
      await addTravelLunchEntry({
        prefectureId,
        imageUri,
        restaurantName,
        genre,
        visitedAt: visitedLabel,
        rating,
        memo,
      });
      showToast(t('travel.savedToast', { name: restaurantName.trim() }));
      setTimeout(() => router.back(), 600);
    } catch (error) {
      Alert.alert(t('travel.saveFailedTitle'), t('travel.saveFailedBody'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <Text style={[styles.headerBackText, { color: colors.text }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('travel.title')}</Text>
          <Pressable onPress={() => router.push('/travel/pref-list')} style={styles.headerIcon}>
            <FontAwesome name="list" size={18} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => setShowPrefectureModal(true)}
          style={[styles.prefectureChip, { backgroundColor: colors.chip }]}
        >
          <Text style={[styles.prefectureText, { color: colors.text }]}>{prefectureLabel}</Text>
        </Pressable>

        <Pressable
          onPress={pickPhoto}
          style={[
            styles.photoBox,
            { borderColor: colors.border, backgroundColor: colors.card },
            imageUri ? styles.photoBoxFilled : null,
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={[styles.photoPlus, { color: colors.subText }]}>＋</Text>
              <Text style={[styles.photoText, { color: colors.subText }]}>
                {t('travel.addPhoto')}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('travel.infoTitle')}</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{t('travel.restaurantLabel')}</Text>
            <TextInput
              value={restaurantName}
              onChangeText={setRestaurantName}
              placeholder={t('travel.restaurantPlaceholder')}
              placeholderTextColor={colors.subText}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{t('travel.genreLabel')}</Text>
            <Pressable
              onPress={() => setShowGenreModal(true)}
              style={[styles.input, styles.selector, { borderColor: colors.border }]}
            >
              <Text style={[styles.selectorText, { color: genre ? colors.text : colors.subText }]}>
                {genre || t('travel.genrePlaceholder')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{t('travel.dateLabel')}</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.input, styles.selector, { borderColor: colors.border }]}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>{visitedLabel}</Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{t('travel.ratingLabel')}</Text>
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, index) => {
                const value = index + 1;
                const active = rating >= value;
                return (
                  <Pressable key={value} onPress={() => setRating(value)} style={styles.starButton}>
                    <Text style={[styles.star, { color: active ? '#F4B740' : colors.border }]}>★</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{t('travel.memoLabel')}</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder={t('travel.memoPlaceholder')}
              placeholderTextColor={colors.subText}
              style={[
                styles.input,
                styles.memoInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
        >
          <Text style={styles.saveButtonText}>{t('travel.saveButton')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showGenreModal} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowGenreModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {GENRES.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setGenre(item);
                  setShowGenreModal(false);
                }}
                style={styles.modalItem}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showPrefectureModal} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPrefectureModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView style={styles.modalScroll}>
              {PREFECTURE_IDS.map((id) => (
                <Pressable
                  key={id}
                  onPress={() => {
                    setPrefectureId(id);
                    setShowPrefectureModal(false);
                  }}
                  style={styles.modalItem}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {t(`prefectures.${id}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={visitedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setVisitedDate(date);
          }}
        />
      )}

      {toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackText: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefectureChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  prefectureText: { fontSize: 14, fontWeight: '600' },
  photoBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  photoBoxFilled: {
    borderStyle: 'solid',
  },
  photoPlaceholder: { alignItems: 'center' },
  photoPlus: { fontSize: 36, marginBottom: 6 },
  photoText: { fontSize: 14 },
  photoPreview: { width: '100%', height: '100%' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  selector: { justifyContent: 'center' },
  selectorText: { fontSize: 14 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  starButton: { marginRight: 6 },
  star: { fontSize: 24 },
  memoInput: { minHeight: 120 },
  saveButton: {
    marginTop: 8,
    marginHorizontal: 8,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 8,
    maxHeight: '70%',
  },
  modalScroll: {
    maxHeight: '70%',
  },
  modalItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  modalItemText: { fontSize: 16 },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(17, 17, 17, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  toastText: { color: '#FFF', fontSize: 14 },
});
