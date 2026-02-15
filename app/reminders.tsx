import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import i18n, { t } from '@/src/i18n';
import { addAlbumPhoto, getAlbumPhotos } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { NeuCard } from '@/src/ui/NeuCard';
import { formatYmd } from '@/src/domain/date';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
  } as const,
  header: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  } as const,
  subText: {
    color: '#6B7280',
  } as const,
  addBtn: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    alignItems: 'center',
  } as const,
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  } as const,
  controlRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  } as const,
  controlBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#E9E4DA',
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  controlBtnActive: {
    backgroundColor: '#FEF3C7',
  } as const,
  controlText: {
    fontWeight: '700',
    color: '#374151',
  } as const,
  controlTextActive: {
    color: '#B45309',
  } as const,
  image: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#D5D0C6',
  } as const,
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  imageText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  } as const,
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  } as const,
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  } as const,
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  } as const,
  modalCard: {
    backgroundColor: '#E9E4DA',
    borderRadius: 20,
    padding: 16,
  } as const,
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  } as const,
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  } as const,
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#D5D0C6',
  } as const,
  modalBtnPrimary: {
    backgroundColor: '#F59E0B',
  } as const,
  modalBtnText: {
    color: '#374151',
    fontWeight: '700',
  } as const,
  modalBtnTextPrimary: {
    color: '#FFFFFF',
  } as const,
} as const;

export default function AlbumScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Awaited<ReturnType<typeof getAlbumPhotos>>>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<Date>(new Date());
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);
  const [filterPendingDate, setFilterPendingDate] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    const next = await getAlbumPhotos();
    setPhotos(next);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const ordered = useMemo(() => {
    let list = photos;
    if (filterDate) {
      list = list.filter((item) => formatYmd(new Date(item.takenAt)) === filterDate);
    }
    const dir = sortOrder === 'desc' ? -1 : 1;
    return list.slice().sort((a, b) => {
      const aTime = a.takenAt ?? a.createdAt;
      const bTime = b.takenAt ?? b.createdAt;
      return (aTime - bTime) * dir;
    });
  }, [photos, filterDate, sortOrder]);

  const empty = useMemo(() => !loading && ordered.length === 0, [loading, ordered.length]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <Text style={UI.header}>{t('album.title')}</Text>
        <Pressable
          onPress={async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert(t('album.photoPermissionTitle'), t('album.photoPermissionBody'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (result.canceled) return;
            const uri = result.assets?.[0]?.uri;
            if (!uri) return;
            setPendingUri(uri);
            setPendingDate(new Date());
            setPickerVisible(true);
          }}
          style={UI.addBtn}>
          <Text style={UI.addBtnText}>{t('album.addPhoto')}</Text>
        </Pressable>
        <View style={UI.controlRow}>
          <Pressable
            onPress={() => setSortOrder('desc')}
            style={[UI.controlBtn, sortOrder === 'desc' && UI.controlBtnActive]}>
            <Text style={[UI.controlText, sortOrder === 'desc' && UI.controlTextActive]}>{t('album.sortNew')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setSortOrder('asc')}
            style={[UI.controlBtn, sortOrder === 'asc' && UI.controlBtnActive]}>
            <Text style={[UI.controlText, sortOrder === 'asc' && UI.controlTextActive]}>{t('album.sortOld')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setFilterPendingDate(filterDate ? new Date(filterDate) : new Date());
              setFilterPickerVisible(true);
            }}
            style={UI.controlBtn}>
            <Text style={UI.controlText}>{filterDate ? `${filterDate}` : t('album.filterByDate')}</Text>
          </Pressable>
        </View>
        {filterDate && (
          <Pressable
            onPress={() => setFilterDate(null)}
            style={[UI.controlBtn, { marginBottom: 12 }]}>
            <Text style={UI.controlText}>{t('album.clearDateFilter')}</Text>
          </Pressable>
        )}
        {empty && (
          <Text style={UI.subText}>{filterDate ? t('album.emptyForDate') : t('album.empty')}</Text>
        )}

        <FlatList
          data={ordered}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!item.storeId) return;
                router.push({ pathname: '/store/[id]', params: { id: item.storeId } });
              }}
              style={{ flex: 1 }}>
              <View style={{ gap: 6 }}>
                <Image source={{ uri: item.uri }} style={UI.gridImage} />
                <Text style={UI.dateText}>{formatYmd(new Date(item.takenAt))}</Text>
              </View>
            </Pressable>
          )}
        />
      </View>

      <BottomAdBanner />

      <Modal transparent visible={pickerVisible} animationType="fade">
        <View style={UI.modalBackdrop}>
          <NeuCard style={UI.modalCard}>
            <Text style={UI.modalTitle}>{t('album.pickDate')}</Text>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale={i18n.locale.startsWith('ja') ? 'ja-JP' : 'en-US'}
              onChange={(event, date) => {
                if (Platform.OS === 'android' && event.type === 'dismissed') {
                  setPickerVisible(false);
                  setPendingUri(null);
                  return;
                }
                if (date) setPendingDate(date);
              }}
            />
            <View style={UI.modalActions}>
              <Pressable
                onPress={() => {
                  setPickerVisible(false);
                  setPendingUri(null);
                }}
                style={UI.modalBtn}>
                <Text style={UI.modalBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!pendingUri) return;
                  await addAlbumPhoto(pendingUri, undefined, pendingDate.getTime());
                  await refresh();
                  setPickerVisible(false);
                  setPendingUri(null);
                }}
                style={[UI.modalBtn, UI.modalBtnPrimary]}>
                <Text style={[UI.modalBtnText, UI.modalBtnTextPrimary]}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </NeuCard>
        </View>
      </Modal>

      <Modal transparent visible={filterPickerVisible} animationType="fade">
        <View style={UI.modalBackdrop}>
          <NeuCard style={UI.modalCard}>
            <Text style={UI.modalTitle}>{t('album.pickDate')}</Text>
            <DateTimePicker
              value={filterPendingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale={i18n.locale.startsWith('ja') ? 'ja-JP' : 'en-US'}
              onChange={(event, date) => {
                if (Platform.OS === 'android' && event.type === 'dismissed') {
                  setFilterPickerVisible(false);
                  return;
                }
                if (date) setFilterPendingDate(date);
              }}
            />
            <View style={UI.modalActions}>
              <Pressable
                onPress={() => setFilterPickerVisible(false)}
                style={UI.modalBtn}>
                <Text style={UI.modalBtnText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setFilterDate(formatYmd(filterPendingDate));
                  setFilterPickerVisible(false);
                }}
                style={[UI.modalBtn, UI.modalBtnPrimary]}>
                <Text style={[UI.modalBtnText, UI.modalBtnTextPrimary]}>{t('album.select')}</Text>
              </Pressable>
            </View>
          </NeuCard>
        </View>
      </Modal>
    </View>
  );
}
