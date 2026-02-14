import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Clipboard from 'expo-clipboard';

import { t } from '@/src/i18n';
import {
  addMapStore,
  deleteMapStore,
  listenMap,
  listenMapStores,
  setMapReadOnly,
  updateMapStoreTag,
  type SharedMap,
  type SharedStore,
} from '@/src/sharedMaps';
import { useAuth } from '@/src/state/AuthContext';
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
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#FECACA',
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

  const [inviteVisible, setInviteVisible] = useState(false);
  const [filterTag, setFilterTag] = useState<'all' | 'favorite' | 'want' | 'again'>('all');
  const [readOnlyUpdating, setReadOnlyUpdating] = useState(false);

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
        <Text style={{ color: '#6B7280' }}>{t('sharedDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>{t('common.back')}</Text>
          </Pressable>
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
            {map?.name ?? t('sharedDetail.defaultName')}
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 6 }}>
            {t('shared.inviteCodeLabel')} {map?.code ?? '-'}
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 2 }}>
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
              style={{ marginTop: 10, ...UI.secondaryBtn, paddingVertical: 8 }}>
              <Text style={{ fontWeight: '800', color: '#111827' }}>
                {isReadOnly ? t('sharedDetail.readOnlyOff') : t('sharedDetail.readOnlyOn')}
              </Text>
            </Pressable>
          ) : isReadOnly ? (
            <Text style={{ color: '#B45309', marginTop: 8, fontWeight: '800' }}>
              {t('sharedDetail.readOnlyNotice')}
            </Text>
          ) : null}
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>{t('sharedDetail.addStore')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('sharedDetail.storeNamePlaceholder')}
            style={UI.input}
            {...INPUT_PROPS}
          />
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder={t('sharedDetail.memoPlaceholder')}
            style={{ marginTop: 8, ...UI.input }}
            {...INPUT_PROPS}
          />

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('sharedDetail.location')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={async () => {
                  const fg = await Location.requestForegroundPermissionsAsync();
                  if (!fg.granted) {
                    Alert.alert(t('sharedDetail.locationTitle'), t('sharedDetail.locationBody'));
                    return;
                  }
                  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                  setLatitude(pos.coords.latitude);
                  setLongitude(pos.coords.longitude);
                  setDeviceLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                  setMapRegion(toRegion(pos.coords.latitude, pos.coords.longitude));
                }}
                style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
                <Text style={{ fontWeight: '800', color: '#111827' }}>{t('sharedDetail.getCurrent')}</Text>
              </Pressable>
            </View>
            <Text style={{ color: '#6B7280', marginTop: 6 }}>
              {t('sharedDetail.latLabel', { value: latitude ?? '-' })} /{' '}
              {t('sharedDetail.lngLabel', { value: longitude ?? '-' })}
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: '800', marginBottom: 6 }}>{t('sharedDetail.pickOnMap')}</Text>
            <Text style={{ color: '#6B7280', marginBottom: 8 }}>{t('sharedDetail.pickOnMapHelp')}</Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#E7E2D5',
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: 'white',
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
                  <Text style={{ color: '#6B7280' }}>{t('sharedDetail.locationLoading')}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ color: '#6B7280' }}>{t('sharedDetail.placeId', { value: placeId || '-' })}</Text>
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
            <Text style={{ color: 'white', fontWeight: '900' }}>
              {saving ? t('sharedDetail.saving') : t('common.save')}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '900' }}>{t('sharedDetail.storeList')}</Text>
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
                    borderWidth: 1,
                    borderColor: active ? '#F59E0B' : '#E5E7EB',
                    backgroundColor: active ? '#FFF7E6' : '#FFFFFF',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}>
                  <Text style={{ color: active ? '#B45309' : '#6B7280', fontWeight: '800', fontSize: 12 }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {stores.length === 0 && <Text style={{ color: '#6B7280' }}>{t('sharedDetail.empty')}</Text>}
          <View style={{ gap: 10 }}>
            {(filterTag === 'all' ? stores : stores.filter((s) => s.tag === filterTag)).map((item) => {
              const canDelete = user?.uid && user.uid === item.createdBy && canEdit;
              return (
                <View key={item.id} style={UI.card}>
                  <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.tag ? (
                    <Text style={{ color: '#B45309', marginTop: 4, fontWeight: '800' }}>
                      {item.tag === 'favorite'
                        ? t('sharedDetail.tags.favorite')
                        : item.tag === 'want'
                        ? t('sharedDetail.tags.want')
                        : t('sharedDetail.tags.again')}
                    </Text>
                  ) : null}
                  {!!item.memo && (
                    <Text style={{ color: '#6B7280', marginTop: 4 }} numberOfLines={2}>
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
                            borderWidth: 1,
                            borderColor: active ? '#F59E0B' : '#E5E7EB',
                            backgroundColor: active ? '#FFF7E6' : '#FFFFFF',
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }}>
                          <Text style={{ color: active ? '#B45309' : '#6B7280', fontWeight: '800', fontSize: 12 }}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable
                      onPress={() => openGoogleMaps(item)}
                      style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 10 }}>
                      <Text style={{ fontWeight: '800', color: '#111827' }}>{t('sharedDetail.openGoogleMaps')}</Text>
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
                        style={UI.dangerBtn}>
                        <Text style={{ color: '#B91C1C', fontWeight: '800' }}>{t('storeDetail.deleteConfirm')}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
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
          <View
            style={{
              width: '100%',
              borderRadius: 18,
              backgroundColor: '#FFFEF8',
              padding: 16,
              borderWidth: 1,
              borderColor: '#E7E2D5',
            }}>
            <Pressable onPress={() => setInviteVisible(false)} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontWeight: '900', fontSize: 18 }}>×</Text>
            </Pressable>

            <Text style={{ fontWeight: '900', fontSize: 16, textAlign: 'center', marginTop: 4 }}>
              {t('sharedDetail.inviteTitle')}
            </Text>
            <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
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
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#B45309' }}>{inviteCode || '------'}</Text>
            </Pressable>

            <View style={{ alignItems: 'center', marginTop: 12 }}>
              {inviteCode ? <Image source={{ uri: inviteQrUrl }} style={{ width: 140, height: 140 }} /> : null}
              <Text style={{ color: '#6B7280', marginTop: 8 }}>{t('sharedDetail.inviteQr')}</Text>
            </View>

            <Pressable
              onPress={copyInviteCode}
              style={{
                marginTop: 12,
                backgroundColor: '#F59E0B',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: 'white', fontWeight: '900' }}>{t('sharedDetail.copyCode')}</Text>
            </Pressable>
            <Pressable
              onPress={copyInviteLink}
              style={{
                marginTop: 10,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E5E5E5',
              }}>
              <Text style={{ color: '#111827', fontWeight: '900' }}>{t('sharedDetail.copyLink')}</Text>
            </Pressable>

            <Pressable onPress={() => setInviteVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
