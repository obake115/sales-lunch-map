import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';

import { t } from '@/src/i18n';
import {
  addMapStore,
  addStoreComment,
  deleteMap,
  deleteMapStore,
  deleteStoreComment,
  leaveMap,
  listenMap,
  listenMapStores,
  listenStoreComments,
  renameMap,
  setMapReadOnly,
  updateMapStoreTag,
  type SharedMap,
  type SharedStore,
  type StoreComment,
} from '@/src/sharedMaps';
import { useAuth } from '@/src/state/AuthContext';
import { getProfileName } from '@/src/storage';
import { useThemeColors } from '@/src/state/ThemeContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
  } as const,
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#E9E4DA',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  primaryBtn: {
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    backgroundColor: '#E9E4DA',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  dangerBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  } as const,
} as const;

const INPUT_PROPS = {
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none' as const,
  autoComplete: 'off' as const,
  keyboardType: 'default' as const,
  blurOnSubmit: false,
};

function toRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };
}

function StoreCommentSection({
  mapId,
  storeId,
  userId,
  userName,
  colors,
}: {
  mapId: string;
  storeId: string;
  userId: string;
  userName?: string;
  colors: any;
}) {
  const [comments, setComments] = useState<StoreComment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const unsub = listenStoreComments(mapId, storeId, setComments);
    return () => unsub();
  }, [mapId, storeId, expanded]);

  const handlePost = useCallback(async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await addStoreComment(mapId, storeId, { text, authorId: userId, authorName: userName });
      setText('');
    } catch (e: any) {
      Alert.alert(t('sharedDetail.commentFailedTitle'), e?.message ?? t('shared.tryLater'));
    } finally {
      setPosting(false);
    }
  }, [text, posting, mapId, storeId, userId, userName]);

  return (
    <View style={{ marginTop: 8 }}>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: '#4F78FF' }}>
          {expanded ? t('sharedDetail.hideComments') : t('sharedDetail.showComments')}
        </Text>
      </Pressable>
      {expanded && (
        <View style={{ marginTop: 6, gap: 6 }}>
          {comments.length === 0 && (
            <Text style={{ color: colors.subText, fontSize: 12 }}>{t('sharedDetail.noComments')}</Text>
          )}
          {comments.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 11, color: colors.subText }}>
                  {c.authorName || t('sharedDetail.anonymousUser')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.text }}>{c.text}</Text>
              </View>
              {c.authorId === userId && (
                <Pressable
                  onPress={async () => {
                    try {
                      await deleteStoreComment(mapId, storeId, c.id);
                    } catch {}
                  }}>
                  <Text style={{ color: '#B91C1C', fontSize: 11, fontFamily: fonts.extraBold }}>
                    {t('storeDetail.deleteConfirm')}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('sharedDetail.commentPlaceholder')}
              placeholderTextColor={colors.subText}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: colors.inputBg,
                color: colors.text,
                fontSize: 13,
              }}
            />
            <Pressable
              disabled={!text.trim() || posting}
              onPress={handlePost}
              style={{
                backgroundColor: text.trim() ? '#4F78FF' : '#9BB8FF',
                borderRadius: 10,
                paddingHorizontal: 12,
                justifyContent: 'center',
              }}>
              <Text style={{ color: 'white', fontFamily: fonts.extraBold, fontSize: 12 }}>
                {t('sharedDetail.postComment')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

async function openGoogleMaps(store: { name: string; latitude: number; longitude: number; placeId?: string }) {
  const query = store.placeId ? store.name : `${store.latitude},${store.longitude}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${
    store.placeId ? `&query_place_id=${encodeURIComponent(store.placeId)}` : ''
  }`;
  await Linking.openURL(url);
}

export default function SharedMapDetailScreen() {
  const router = useRouter();
  const { id, showInvite } = useLocalSearchParams<{ id: string; showInvite?: string }>();
  const mapId = id ?? '';
  const { user } = useAuth();
  const colors = useThemeColors();

  const [map, setMap] = useState<SharedMap | null>(null);
  const [stores, setStores] = useState<SharedStore[]>([]);
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [saving, setSaving] = useState(false);
  const [deviceLatLng, setDeviceLatLng] = useState<{ latitude: number; longitude: number } | null>(null);

  const [profileName, setProfileName] = useState('');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [filterTag, setFilterTag] = useState<'all' | 'favorite' | 'want' | 'again'>('all');
  const [readOnlyUpdating, setReadOnlyUpdating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!mapId) return;
    const unsub = listenMap(mapId, setMap);
    return () => unsub();
  }, [mapId]);

  useEffect(() => {
    if (showInvite !== '1') return;
    if (!map?.code) return;
    setInviteVisible(true);
  }, [showInvite, map?.code]);

  useEffect(() => {
    if (!mapId) return;
    const unsub = listenMapStores(mapId, setStores);
    return () => unsub();
  }, [mapId]);

  useEffect(() => {
    (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setMapRegion((current) => current ?? toRegion(pos.coords.latitude, pos.coords.longitude));
    })();
  }, []);

  useEffect(() => {
    getProfileName().then(setProfileName).catch(() => {});
  }, []);

  const isOwner = !!user?.uid && user.uid === map?.ownerId;
  const isReadOnly = !!map?.isReadOnly;
  const canEdit = !isReadOnly || isOwner;
  const canSave = name.trim().length > 0 && latitude != null && longitude != null && !saving && canEdit;

  const inviteCode = map?.code ?? '';
  const inviteQrUrl = inviteCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteCode)}`
    : '';
  const inviteLink = inviteCode
    ? ExpoLinking.createURL('/shared', { queryParams: { code: inviteCode } })
    : '';
  const copyInviteCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert(t('sharedDetail.copiedTitle'), t('sharedDetail.copiedCode'));
  };
  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert(t('sharedDetail.copiedTitle'), t('sharedDetail.copiedLink'));
  };

  if (!mapId) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: colors.subText }}>{t('sharedDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flex: 1, ...UI.secondaryBtn, backgroundColor: colors.card, shadowColor: colors.shadowDark, paddingVertical: 12 }}>
            <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('common.back')}</Text>
          </Pressable>
        </View>

        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          {renaming ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder={t('sharedDetail.renamePlaceholder')}
                style={[{ flex: 1 }, UI.input, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark }]}
                autoFocus
                {...INPUT_PROPS}
              />
              <Pressable
                onPress={async () => {
                  try {
                    await renameMap(mapId, editName);
                    setRenaming(false);
                  } catch (e: any) {
                    Alert.alert(t('sharedDetail.renameFailedTitle'), e?.message ?? t('shared.tryLater'));
                  }
                }}
                style={{ ...UI.primaryBtn, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: 'white', fontFamily: fonts.extraBold, fontSize: 13 }}>{t('sharedDetail.renameSave')}</Text>
              </Pressable>
              <Pressable onPress={() => setRenaming(false)}>
                <Text style={{ color: colors.subText, fontFamily: fonts.extraBold, fontSize: 13 }}>{t('sharedDetail.renameCancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text, flex: 1 }} numberOfLines={1}>
                {map?.name ?? t('sharedDetail.defaultName')}
              </Text>
              {isOwner && (
                <Pressable
                  onPress={() => {
                    setEditName(map?.name ?? '');
                    setRenaming(true);
                  }}>
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </Pressable>
              )}
            </View>
          )}
          <Text style={{ color: colors.subText, marginTop: 6 }}>
            {t('shared.inviteCodeLabel')} {map?.code ?? '-'}
          </Text>
          <Text style={{ color: colors.subText, marginTop: 2 }}>
            {t('shared.membersLabel', { count: map?.memberIds?.length ?? 0 })}
          </Text>
          {isOwner ? (
            <Pressable
              disabled={readOnlyUpdating}
              onPress={async () => {
                if (!map) return;
                setReadOnlyUpdating(true);
                try {
                  await setMapReadOnly(map.id, !isReadOnly);
                } finally {
                  setReadOnlyUpdating(false);
                }
              }}
              style={{ marginTop: 10, ...UI.secondaryBtn, backgroundColor: colors.card, shadowColor: colors.shadowDark, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>
                {isReadOnly ? t('sharedDetail.readOnlyOff') : t('sharedDetail.readOnlyOn')}
              </Text>
            </Pressable>
          ) : isReadOnly ? (
            <Text style={{ color: '#B45309', marginTop: 8, fontFamily: fonts.extraBold }}>
              {t('sharedDetail.readOnlyNotice')}
            </Text>
          ) : null}
          <Pressable
            onPress={() => {
              if (isOwner) {
                Alert.alert(
                  t('sharedDetail.deleteMapTitle'),
                  t('sharedDetail.deleteMapBody'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('storeDetail.deleteConfirm'),
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteMap(mapId);
                          router.back();
                        } catch (e: any) {
                          Alert.alert(t('sharedDetail.deleteFailedTitle'), e?.message ?? t('shared.tryLater'));
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  t('sharedDetail.leaveMapTitle'),
                  t('sharedDetail.leaveMapBody'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('sharedDetail.leaveMapConfirm'),
                      style: 'destructive',
                      onPress: async () => {
                        if (!user) return;
                        try {
                          await leaveMap(mapId, user.uid);
                          router.back();
                        } catch (e: any) {
                          Alert.alert(t('sharedDetail.leaveFailedTitle'), e?.message ?? t('shared.tryLater'));
                        }
                      },
                    },
                  ]
                );
              }
            }}
            style={{ marginTop: 10, ...UI.dangerBtn, backgroundColor: colors.dangerBg, alignItems: 'center' }}>
            <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold }}>
              {isOwner ? t('sharedDetail.deleteMapButton') : t('sharedDetail.leaveMapButton')}
            </Text>
          </Pressable>
        </NeuCard>

        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 8, color: colors.text }}>{t('sharedDetail.addStore')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('sharedDetail.storeNamePlaceholder')}
            style={[UI.input, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark }]}
            {...INPUT_PROPS}
          />
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder={t('sharedDetail.memoPlaceholder')}
            style={[{ marginTop: 8 }, UI.input, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark }]}
            {...INPUT_PROPS}
          />

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('sharedDetail.location')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={async () => {
                  const fg = await Location.requestForegroundPermissionsAsync();
                  if (!fg.granted) {
                    Alert.alert(
                      t('locationDenied.title'),
                      t('locationDenied.body'),
                      [
                        { text: t('locationDenied.cancel'), style: 'cancel' },
                        { text: t('locationDenied.openSettings'), onPress: () => Linking.openSettings() },
                      ]
                    );
                    return;
                  }
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                  setLatitude(pos.coords.latitude);
                  setLongitude(pos.coords.longitude);
                  setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                  setMapRegion(toRegion(pos.coords.latitude, pos.coords.longitude));
                }}
                style={{ flex: 1, ...UI.secondaryBtn, backgroundColor: colors.card, shadowColor: colors.shadowDark, paddingVertical: 12 }}>
                <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('sharedDetail.getCurrent')}</Text>
              </Pressable>
            </View>
            <Text style={{ color: colors.subText, marginTop: 6 }}>
              {t('sharedDetail.latLabel', { value: latitude ?? '-' })} /{' '}
              {t('sharedDetail.lngLabel', { value: longitude ?? '-' })}
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6, color: colors.text }}>{t('sharedDetail.pickOnMap')}</Text>
            <Text style={{ color: colors.subText, marginBottom: 8 }}>{t('sharedDetail.pickOnMapHelp')}</Text>
            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: colors.card,
                height: 220,
              }}>
              {mapRegion ? (
                <MapView
                  style={{ flex: 1 }}
                  region={mapRegion}
                  onRegionChangeComplete={setMapRegion}
                  onPress={(e) => {
                    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                    setLatitude(lat);
                    setLongitude(lng);
                    setMapRegion(toRegion(lat, lng));
                  }}
                  showsUserLocation>
                  {latitude != null && longitude != null && (
                    <Marker coordinate={{ latitude, longitude }} />
                  )}
                </MapView>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.subText }}>{t('sharedDetail.locationLoading')}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ color: colors.subText }}>{t('sharedDetail.placeId', { value: placeId || '-' })}</Text>
          </View>

          <Pressable
            disabled={!canSave}
            onPress={async () => {
              if (!user) return;
              if (!canSave) return;
              try {
                setSaving(true);
                await addMapStore(mapId, {
                  name,
                  memo,
                  placeId: placeId.trim().length > 0 ? placeId.trim() : undefined,
                  latitude: latitude as number,
                  longitude: longitude as number,
                  createdBy: user.uid,
                });
                setName('');
                setMemo('');
                setPlaceId('');
                setLatitude(null);
                setLongitude(null);
              } catch (e: any) {
                Alert.alert(t('sharedDetail.saveFailedTitle'), e?.message ?? t('shared.tryLater'));
              } finally {
                setSaving(false);
              }
            }}
            style={{
              marginTop: 10,
              ...UI.primaryBtn,
              backgroundColor: canSave ? UI.primaryBtn.backgroundColor : '#9BB8FF',
            }}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>
              {saving ? t('sharedDetail.saving') : t('common.save')}
            </Text>
          </Pressable>
        </NeuCard>

        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('sharedDetail.storeList')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'favorite', 'want', 'again'] as const).map((tag) => {
              const active = filterTag === tag;
              const label =
                tag === 'all'
                  ? t('sharedDetail.tags.all')
                  : tag === 'favorite'
                  ? t('sharedDetail.tags.favorite')
                  : tag === 'want'
                  ? t('sharedDetail.tags.want')
                  : t('sharedDetail.tags.again');
              return (
                <Pressable
                  key={tag}
                  onPress={() => setFilterTag(tag)}
                  style={{
                    backgroundColor: active ? '#FFF7E6' : colors.card,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    shadowColor: colors.shadowDark,
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 4,
                  }}>
                  <Text style={{ color: active ? '#B45309' : colors.subText, fontFamily: fonts.extraBold, fontSize: 12 }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {stores.length === 0 && <Text style={{ color: colors.subText }}>{t('sharedDetail.empty')}</Text>}
          <View style={{ gap: 10 }}>
            {(filterTag === 'all' ? stores : stores.filter((s) => s.tag === filterTag)).map((item) => {
              const canDelete = user?.uid && user.uid === item.createdBy && canEdit;
              return (
                <NeuCard key={item.id} style={[UI.card, { backgroundColor: colors.card }]}>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.tag ? (
                    <Text style={{ color: '#B45309', marginTop: 4, fontFamily: fonts.extraBold }}>
                      {item.tag === 'favorite'
                        ? t('sharedDetail.tags.favorite')
                        : item.tag === 'want'
                        ? t('sharedDetail.tags.want')
                        : t('sharedDetail.tags.again')}
                    </Text>
                  ) : null}
                  {!!item.memo && (
                    <Text style={{ color: colors.subText, marginTop: 4 }} numberOfLines={2}>
                      {t('sharedDetail.memoLabel')} {item.memo}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {(['favorite', 'want', 'again'] as const).map((tag) => {
                      const active = item.tag === tag;
                      const label =
                        tag === 'favorite'
                          ? t('sharedDetail.tags.favorite')
                          : tag === 'want'
                          ? t('sharedDetail.tags.want')
                          : t('sharedDetail.tags.again');
                      return (
                        <Pressable
                          key={tag}
                          disabled={!canEdit}
                          onPress={async () => {
                            if (!canEdit) return;
                            try {
                              await updateMapStoreTag(mapId, item.id, active ? null : tag);
                            } catch (e: any) {
                              Alert.alert(t('sharedDetail.updateFailedTitle'), e?.message ?? t('shared.tryLater'));
                            }
                          }}
                          style={{
                            backgroundColor: active ? '#FFF7E6' : colors.card,
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            shadowColor: colors.shadowDark,
                            shadowOffset: { width: 2, height: 2 },
                            shadowOpacity: 0.4,
                            shadowRadius: 4,
                          }}>
                          <Text style={{ color: active ? '#B45309' : colors.subText, fontFamily: fonts.extraBold, fontSize: 12 }}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable
                      onPress={() => openGoogleMaps(item)}
                      style={{ flex: 1, ...UI.secondaryBtn, backgroundColor: colors.card, shadowColor: colors.shadowDark, paddingVertical: 10 }}>
                      <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('sharedDetail.openGoogleMaps')}</Text>
                    </Pressable>
                    {canDelete && (
                      <Pressable
                        onPress={async () => {
                          try {
                            await deleteMapStore(mapId, item.id);
                          } catch (e: any) {
                            Alert.alert(t('sharedDetail.deleteFailedTitle'), e?.message ?? t('shared.tryLater'));
                          }
                        }}
                        style={[UI.dangerBtn, { backgroundColor: colors.dangerBg }]}>
                        <Text style={{ color: '#B91C1C', fontFamily: fonts.extraBold }}>{t('storeDetail.deleteConfirm')}</Text>
                      </Pressable>
                    )}
                  </View>
                  {user?.uid && (
                    <StoreCommentSection
                      mapId={mapId}
                      storeId={item.id}
                      userId={user.uid}
                      userName={profileName || undefined}
                      colors={colors}
                    />
                  )}
                </NeuCard>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <BottomAdBanner />

      <Modal visible={inviteVisible} transparent animationType="fade" onRequestClose={() => setInviteVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}>
          <NeuCard
            style={{
              width: '100%',
              borderRadius: 20,
              backgroundColor: colors.card,
              padding: 16,
            }}>
            <Pressable onPress={() => setInviteVisible(false)} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, color: colors.text }}>×</Text>
            </Pressable>

            <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, textAlign: 'center', marginTop: 4, color: colors.text }}>
              {t('sharedDetail.inviteTitle')}
            </Text>
            <Text style={{ color: colors.subText, textAlign: 'center', marginTop: 6 }}>
              {t('sharedDetail.inviteBody')}
            </Text>

            <Pressable
              onLongPress={copyInviteCode}
              style={{
                marginTop: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: '#FFF7E6',
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 22, fontFamily: fonts.extraBold, color: '#B45309' }}>{inviteCode || '------'}</Text>
            </Pressable>

            <View style={{ alignItems: 'center', marginTop: 12 }}>
              {inviteCode ? <Image source={{ uri: inviteQrUrl }} style={{ width: 140, height: 140 }} /> : null}
              <Text style={{ color: colors.subText, marginTop: 8 }}>{t('sharedDetail.inviteQr')}</Text>
            </View>

            <Pressable
              onPress={copyInviteCode}
              style={{
                marginTop: 12,
                backgroundColor: '#F59E0B',
                borderRadius: 28,
                paddingVertical: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('sharedDetail.copyCode')}</Text>
            </Pressable>
            <Pressable
              onPress={copyInviteLink}
              style={{
                marginTop: 10,
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                shadowColor: colors.shadowDark,
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
              }}>
              <Text style={{ color: colors.text, fontFamily: fonts.extraBold }}>{t('sharedDetail.copyLink')}</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                const message = t('sharedDetail.shareInviteMessage', { name: map?.name ?? '', code: inviteCode });
                await Share.share({ message });
              }}
              style={{
                marginTop: 10,
                ...UI.primaryBtn,
                backgroundColor: '#4F78FF',
              }}>
              <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('sharedDetail.shareInvite')}</Text>
            </Pressable>

            <Pressable onPress={() => setInviteVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: '#4F78FF', fontFamily: fonts.extraBold }}>{t('common.close')}</Text>
            </Pressable>
          </NeuCard>
        </View>
      </Modal>
    </View>
  );
}
