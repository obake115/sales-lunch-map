import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { addAlbumPhoto, getAlbumPhotos } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { formatYmd } from '@/src/domain/date';

const UI = {
  card: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  image: {
    width: 88,
    height: 88,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    backgroundColor: '#F3F4F6',
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

  const empty = useMemo(() => !loading && photos.length === 0, [loading, photos.length]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110 }}>
        <Text style={UI.header}>アルバム</Text>
        <Pressable
          onPress={async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('写真へのアクセスが必要です', 'アルバムに追加するために許可してください。');
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
          <Text style={UI.addBtnText}>写真を追加</Text>
        </Pressable>
        {empty && <Text style={UI.subText}>まだ写真がありません。</Text>}

        <FlatList
          data={photos}
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
          <View style={UI.modalCard}>
            <Text style={UI.modalTitle}>日付を選択</Text>
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="ja-JP"
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
                <Text style={UI.modalBtnText}>キャンセル</Text>
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
                <Text style={[UI.modalBtnText, UI.modalBtnTextPrimary]}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
