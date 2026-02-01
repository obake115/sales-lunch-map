import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

import { useStores } from '@/src/state/StoresContext';
import type { Memo } from '@/src/models';
import { addMemo, clearCheckedMemos, deleteMemo, getMemos, setMemoReminder, toggleMemoChecked, updateMemoText, updateStore } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';

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
  input: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  } as const,
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7E2D5',
    backgroundColor: '#FFFFFF',
  } as const,
} as const;

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = id ?? '';

  const { stores, setStoreEnabled, refresh } = useStores();
  const store = useMemo(() => stores.find((s) => s.id === storeId) ?? null, [stores, storeId]);

  const [memos, setMemos] = useState<Memo[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [reminderEditingId, setReminderEditingId] = useState<string | null>(null);
  const [reminderDraftAtMs, setReminderDraftAtMs] = useState<number>(Date.now() + 60 * 60 * 1000);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time' | null>(null);
  const [iosPickerMode, setIosPickerMode] = useState<'date' | 'time'>('date');
  const [storeNameEditing, setStoreNameEditing] = useState(false);
  const [storeNameDraft, setStoreNameDraft] = useState('');
  const [memoEditingId, setMemoEditingId] = useState<string | null>(null);
  const [memoDraftText, setMemoDraftText] = useState('');
  const [showOnlyUnchecked, setShowOnlyUnchecked] = useState(false);

  const refreshMemos = useCallback(async () => {
    if (!storeId) return;
    const next = await getMemos(storeId);
    setMemos(next);
  }, [storeId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await refreshMemos();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshMemos]);

  function formatDateTime(ms: number) {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}年${m}月${day}日 ${hh}:${mm}`;
  }

  if (!store) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: '#6B7280' }}>店舗が見つかりません。</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110, gap: 12 }}>
        <View style={UI.card}>
          <Pressable
            onPress={() => {
              setStoreNameDraft(store.name);
              setStoreNameEditing(true);
            }}>
            <Text style={{ fontWeight: '900', fontSize: 18 }} numberOfLines={1}>
              {store.name}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ color: '#6B7280' }}>通知: {store.enabled ? 'ON' : 'OFF'}（近づいたとき）</Text>
            <Switch value={store.enabled} onValueChange={(v) => setStoreEnabled(store.id, v)} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable
              onPress={async () => {
                await Notifications.scheduleNotificationAsync({
                  content: { title: '通知テスト', body: '通知が届くか確認できます', sound: 'default' },
                  trigger: null,
                });
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E7E2D5',
                backgroundColor: '#FFFFFF',
              }}>
              <Text style={{ color: '#111827', fontWeight: '800' }}>通知テスト</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                await clearCheckedMemos(store.id);
                await refreshMemos();
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E7E2D5',
                backgroundColor: '#FFFFFF',
              }}>
              <Text style={{ color: '#111827', fontWeight: '800' }}>完了を一括削除</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '800' }}>メモ追加</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="例：牛乳、電池、ゴミ袋…"
              style={{
                flex: 1,
                ...UI.input,
              }}
            />
            <Pressable
              onPress={async () => {
                if (text.trim().length === 0) return;
                await addMemo(store.id, text);
                setText('');
                await refreshMemos();
              }}
              style={{
                ...UI.primaryBtn,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '900' }}>追加</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800' }}>メモ一覧</Text>
            <Pressable
              onPress={() => setShowOnlyUnchecked((v) => !v)}
              style={UI.chip}>
              <Text style={{ fontWeight: '800', color: '#111827' }}>{showOnlyUnchecked ? '未完了のみ' : 'すべて'}</Text>
            </Pressable>
          </View>
          {loading && <Text style={{ color: '#6B7280' }}>読み込み中...</Text>}
          {!loading && memos.length === 0 && <Text style={{ color: '#6B7280' }}>メモがありません。</Text>}

          <FlatList
            data={showOnlyUnchecked ? memos.filter((m) => !m.checked) : memos}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View
                style={UI.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Pressable
                    onPress={async () => {
                      setMemoEditingId(item.id);
                      setMemoDraftText(item.text);
                    }}
                    style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontWeight: '800',
                        textDecorationLine: item.checked ? 'line-through' : 'none',
                        color: item.checked ? '#9CA3AF' : '#111827',
                      }}>
                      {item.text}
                    </Text>
                    {!!item.reminderAt && !item.checked && (
                      <Text style={{ marginTop: 4, color: '#2563EB', fontWeight: '700' }}>
                        リマインド: {formatDateTime(item.reminderAt)}
                      </Text>
                    )}
                  </Pressable>

                  <Switch
                    value={item.checked}
                    onValueChange={async () => {
                      await toggleMemoChecked(store.id, item.id);
                      await refreshMemos();
                    }}
                  />
                </View>

                {!item.checked && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable
                      onPress={() => {
                        setReminderEditingId((cur) => (cur === item.id ? null : item.id));
                        const base = item.reminderAt && item.reminderAt > Date.now() ? item.reminderAt : Date.now() + 60 * 60 * 1000;
                        setReminderDraftAtMs(base);
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
                      <Text style={{ color: '#1D4ED8', fontWeight: '800' }}>リマインド</Text>
                    </Pressable>

                    {!!item.reminderAt && (
                      <Pressable
                        onPress={async () => {
                          await setMemoReminder(store.id, item.id, null);
                          await refreshMemos();
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#E7E2D5',
                          backgroundColor: '#FFFFFF',
                        }}>
                        <Text style={{ color: '#374151', fontWeight: '800' }}>解除</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {reminderEditingId === item.id && !item.checked && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={async () => {
                          try {
                            await setMemoReminder(store.id, item.id, Date.now() + 60 * 60 * 1000);
                            setReminderEditingId(null);
                            await refreshMemos();
                          } catch (e: any) {
                            Alert.alert('設定できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                          }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: '#111827',
                        }}>
                        <Text style={{ color: 'white', fontWeight: '800' }}>+1時間</Text>
                      </Pressable>

                      <Pressable
                        onPress={async () => {
                          try {
                            const d = new Date();
                            d.setHours(20, 0, 0, 0);
                            // if already past today 20:00, use tomorrow
                            if (d.getTime() < Date.now() + 5_000) d.setDate(d.getDate() + 1);
                            await setMemoReminder(store.id, item.id, d.getTime());
                            setReminderEditingId(null);
                            await refreshMemos();
                          } catch (e: any) {
                            Alert.alert('設定できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                          }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: '#111827',
                        }}>
                        <Text style={{ color: 'white', fontWeight: '800' }}>今日20:00</Text>
                      </Pressable>

                      <Pressable
                        onPress={async () => {
                          try {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(9, 0, 0, 0);
                            await setMemoReminder(store.id, item.id, d.getTime());
                            setReminderEditingId(null);
                            await refreshMemos();
                          } catch (e: any) {
                            Alert.alert('設定できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                          }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: '#111827',
                        }}>
                        <Text style={{ color: 'white', fontWeight: '800' }}>明日9:00</Text>
                      </Pressable>
                    </View>

                    {Platform.OS === 'ios' && (
                      <Modal
                        visible={true}
                        animationType="slide"
                        presentationStyle="pageSheet"
                        onRequestClose={() => setReminderEditingId(null)}>
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
                              <Pressable onPress={() => setReminderEditingId(null)}>
                                <Text style={{ color: '#FBBF24', fontWeight: '800', fontSize: 16 }}>キャンセル</Text>
                              </Pressable>
                              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>リマインドを追加</Text>
                              <Pressable
                                onPress={async () => {
                                  try {
                                    await setMemoReminder(store.id, item.id, reminderDraftAtMs);
                                    setReminderEditingId(null);
                                    await refreshMemos();
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
                                value={new Date(reminderDraftAtMs)}
                                mode={iosPickerMode}
                                display="spinner"
                                locale="ja-JP"
                                themeVariant="dark"
                                onChange={(_e, selected) => {
                                  if (!selected) return;
                                  setReminderDraftAtMs((prev) => {
                                    const next = new Date(prev);
                                    if (iosPickerMode === 'date') {
                                      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                                    } else {
                                      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                                    }
                                    return next.getTime();
                                  });
                                }}
                                // iOS spinner can render at 0 height unless explicit.
                                style={{ height: 216, backgroundColor: '#111827' }}
                              />
                            </View>

                            <View style={{ marginTop: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111827' }}>
                              <View
                                style={{
                                  paddingHorizontal: 14,
                                  paddingVertical: 14,
                                  borderBottomWidth: 1,
                                  borderBottomColor: 'rgba(255,255,255,0.06)',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                }}>
                                <Text style={{ color: 'white', fontWeight: '700' }}>ラベル</Text>
                                <Text style={{ color: '#D1D5DB', fontWeight: '700' }} numberOfLines={1}>
                                  {item.text}
                                </Text>
                              </View>
                              <View style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: 'white', fontWeight: '700' }}>日時</Text>
                                <Text style={{ color: '#60A5FA', fontWeight: '800' }}>{formatDateTime(reminderDraftAtMs)}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </Modal>
                    )}

                    {Platform.OS === 'android' && (
                      <View style={{ gap: 8 }}>
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
                        <Text style={{ color: '#6B7280' }}>選択中: {formatDateTime(reminderDraftAtMs)}</Text>

                        {!!androidPickerMode && (
                          <DateTimePicker
                            value={new Date(reminderDraftAtMs)}
                            mode={androidPickerMode}
                            display="default"
                            onChange={(event: any, selected) => {
                              const mode = androidPickerMode;
                              setAndroidPickerMode(null);
                              if (!selected) return;
                              if (event?.type && event.type !== 'set') return;
                              setReminderDraftAtMs((prev) => {
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
                      </View>
                    )}

                    {Platform.OS === 'android' && (
                      <Pressable
                        onPress={async () => {
                          try {
                            await setMemoReminder(store.id, item.id, reminderDraftAtMs);
                            setReminderEditingId(null);
                            await refreshMemos();
                          } catch (e: any) {
                            Alert.alert('設定できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                          }
                        }}
                        style={{
                          paddingVertical: 12,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#2563EB',
                        }}>
                        <Text style={{ color: 'white', fontWeight: '900' }}>この日時で設定</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <Pressable
                    onPress={async () => {
                      await deleteMemo(store.id, item.id);
                      await refreshMemos();
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}>
                    <Text style={{ color: '#374151', fontWeight: '700' }}>削除</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      </View>

      <BottomAdBanner />

      {/* store name edit */}
      <Modal transparent animationType="fade" visible={storeNameEditing} onRequestClose={() => setStoreNameEditing(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: '#FFFEF8', padding: 14, gap: 10 }}>
            <Text style={{ fontWeight: '900', fontSize: 16 }}>店舗名を編集</Text>
            <TextInput
              value={storeNameDraft}
              onChangeText={setStoreNameDraft}
              placeholder="店舗名"
              style={UI.input}
            />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setStoreNameEditing(false)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontWeight: '800', color: '#374151' }}>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const next = storeNameDraft.trim();
                  if (!next) {
                    Alert.alert('店舗名を入力してください');
                    return;
                  }
                  await updateStore(store.id, { name: next });
                  await refresh();
                  setStoreNameEditing(false);
                }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#2563EB' }}>
                <Text style={{ color: 'white', fontWeight: '900' }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* memo edit */}
      <Modal transparent animationType="fade" visible={memoEditingId != null} onRequestClose={() => setMemoEditingId(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: '#FFFEF8', padding: 14, gap: 10 }}>
            <Text style={{ fontWeight: '900', fontSize: 16 }}>メモを編集</Text>
            <TextInput
              value={memoDraftText}
              onChangeText={setMemoDraftText}
              placeholder="メモ"
              style={UI.input}
            />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setMemoEditingId(null)} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontWeight: '800', color: '#374151' }}>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const id = memoEditingId;
                  if (!id) return;
                  try {
                    await updateMemoText(store.id, id, memoDraftText);
                    await refreshMemos();
                    setMemoEditingId(null);
                  } catch (e: any) {
                    Alert.alert('保存できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
                  }
                }}
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#2563EB' }}>
                <Text style={{ color: 'white', fontWeight: '900' }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

