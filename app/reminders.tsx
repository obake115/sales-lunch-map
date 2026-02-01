import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getAllActiveReminders, setMemoReminder, type ReminderListItem } from '@/src/storage';

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
  primaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E2D5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
} as const;

function formatDateTime(ms: number) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}年${m}月${day}日 ${hh}:${mm}`;
}

export default function RemindersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReminderListItem[]>([]);

  const [editing, setEditing] = useState<ReminderListItem | null>(null);
  const [draftAtMs, setDraftAtMs] = useState<number>(Date.now() + 60 * 60 * 1000);
  const [iosPickerMode, setIosPickerMode] = useState<'date' | 'time'>('date');
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time' | null>(null);

  const refresh = useCallback(async () => {
    const next = await getAllActiveReminders();
    setItems(next);
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

  const empty = useMemo(() => !loading && items.length === 0, [loading, items.length]);

  return (
    <View style={{ flex: 1, padding: 16, paddingBottom: 110, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={refresh}
          style={UI.primaryBtn}>
          <Text style={{ color: 'white', fontWeight: '900' }}>{loading ? '更新中...' : '更新'}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={UI.secondaryBtn}>
          <Text style={{ fontWeight: '800', color: '#111827' }}>戻る</Text>
        </Pressable>
      </View>

      {empty && <Text style={{ color: '#6B7280' }}>リマインド設定中のメモがありません。</Text>}

      <FlatList
        data={items}
        keyExtractor={(i) => `${i.storeId}:${i.memoId}`}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <View
            style={{ ...UI.card, gap: 8 }}>
            <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.storeId } })}>
              <Text style={{ fontWeight: '900' }} numberOfLines={1}>
                {item.storeName}
              </Text>
              <Text style={{ marginTop: 4, fontWeight: '800' }} numberOfLines={2}>
                {item.text}
              </Text>
              <Text style={{ marginTop: 6, color: '#2563EB', fontWeight: '800' }}>{formatDateTime(item.reminderAt)}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => {
                  setEditing(item);
                  setDraftAtMs(item.reminderAt);
                  setIosPickerMode('date');
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                  backgroundColor: '#EFF6FF',
                }}>
                <Text style={{ color: '#1D4ED8', fontWeight: '900' }}>変更</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await setMemoReminder(item.storeId, item.memoId, null);
                  await refresh();
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E7E2D5',
                  backgroundColor: '#FFFFFF',
                }}>
                <Text style={{ color: '#374151', fontWeight: '900' }}>解除</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* edit modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={editing != null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setEditing(null)}>
          <View style={{ flex: 1, backgroundColor: '#0B0F17' }}>
            <View
              style={{
                paddingTop: 12,
                paddingHorizontal: 14,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.08)',
                backgroundColor: '#0B0F17',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setEditing(null)}>
                  <Text style={{ color: '#FBBF24', fontWeight: '800', fontSize: 16 }}>キャンセル</Text>
                </Pressable>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>リマインドを変更</Text>
                <Pressable
                  onPress={async () => {
                    if (!editing) return;
                    try {
                      await setMemoReminder(editing.storeId, editing.memoId, draftAtMs);
                      setEditing(null);
                      await refresh();
                    } catch (e: any) {
                      Alert.alert('設定できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                    }
                  }}>
                  <Text style={{ color: '#FBBF24', fontWeight: '900', fontSize: 16 }}>保存</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
              <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#111827' }}>
                <View style={{ flexDirection: 'row' }}>
                  <Pressable
                    onPress={() => setIosPickerMode('date')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      backgroundColor: iosPickerMode === 'date' ? '#0F172A' : '#111827',
                    }}>
                    <Text style={{ color: iosPickerMode === 'date' ? 'white' : '#9CA3AF', fontWeight: '900' }}>日付</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIosPickerMode('time')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      backgroundColor: iosPickerMode === 'time' ? '#0F172A' : '#111827',
                    }}>
                    <Text style={{ color: iosPickerMode === 'time' ? 'white' : '#9CA3AF', fontWeight: '900' }}>時刻</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={new Date(draftAtMs)}
                  mode={iosPickerMode}
                  display="spinner"
                  locale="ja-JP"
                  themeVariant="dark"
                  onChange={(_e, selected) => {
                    if (!selected) return;
                    setDraftAtMs((prev) => {
                      const next = new Date(prev);
                      if (iosPickerMode === 'date') {
                        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                      } else {
                        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                      }
                      return next.getTime();
                    });
                  }}
                  style={{ height: 216, backgroundColor: '#111827' }}
                />
              </View>

              <View style={{ marginTop: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111827' }}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>日時</Text>
                  <Text style={{ color: '#60A5FA', fontWeight: '800' }}>{formatDateTime(draftAtMs)}</Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && editing != null && (
        <Modal transparent animationType="fade" visible={true} onRequestClose={() => setEditing(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View style={{ width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: 'white', padding: 14, gap: 10 }}>
              <Text style={{ fontWeight: '900', fontSize: 16 }}>リマインドを変更</Text>
              <Text style={{ color: '#6B7280' }}>{editing.storeName}</Text>
              <Text style={{ fontWeight: '800' }} numberOfLines={2}>
                {editing.text}
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setAndroidPickerMode('date')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    backgroundColor: 'white',
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontWeight: '800' }}>日付</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAndroidPickerMode('time')}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    backgroundColor: 'white',
                    alignItems: 'center',
                  }}>
                  <Text style={{ fontWeight: '800' }}>時刻</Text>
                </Pressable>
              </View>
              <Text style={{ color: '#2563EB', fontWeight: '900' }}>選択中: {formatDateTime(draftAtMs)}</Text>

              {!!androidPickerMode && (
                <DateTimePicker
                  value={new Date(draftAtMs)}
                  mode={androidPickerMode}
                  display="default"
                  onChange={(event: any, selected) => {
                    const mode = androidPickerMode;
                    setAndroidPickerMode(null);
                    if (!selected) return;
                    if (event?.type && event.type !== 'set') return;
                    setDraftAtMs((prev) => {
                      const next = new Date(prev);
                      if (mode === 'date') {
                        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                      } else {
                        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                      }
                      return next.getTime();
                    });
                  }}
                />
              )}

              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setEditing(null)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontWeight: '800', color: '#374151' }}>キャンセル</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      await setMemoReminder(editing.storeId, editing.memoId, draftAtMs);
                      setEditing(null);
                      await refresh();
                    } catch (e: any) {
                      Alert.alert('設定できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                    }
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#2563EB' }}>
                  <Text style={{ color: 'white', fontWeight: '900' }}>保存</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

