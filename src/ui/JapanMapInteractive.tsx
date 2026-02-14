import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

import { MAP_REGIONS, type MapRegion } from './MapRegions';
import { getPrefecturePhotos } from '@/src/storage';

type JapanMapInteractiveProps = {
  onSelect?: (id: string) => void;
};

const PREF_MARKERS: Record<string, { id: string; x: number; y: number }[]> = {
  hokkaido: [{ id: 'hokkaido', x: 0.55, y: 0.45 }],
  tohoku: [
    { id: 'aomori', x: 0.5, y: 0.1 },
    { id: 'akita', x: 0.25, y: 0.35 },
    { id: 'iwate', x: 0.7, y: 0.35 },
    { id: 'yamagata', x: 0.35, y: 0.6 },
    { id: 'miyagi', x: 0.65, y: 0.6 },
    { id: 'fukushima', x: 0.5, y: 0.85 },
  ],
  kanto: [
    { id: 'gunma', x: 0.35, y: 0.25 },
    { id: 'tochigi', x: 0.55, y: 0.25 },
    { id: 'ibaraki', x: 0.75, y: 0.35 },
    { id: 'saitama', x: 0.45, y: 0.45 },
    { id: 'tokyo', x: 0.55, y: 0.6 },
    { id: 'chiba', x: 0.75, y: 0.6 },
    { id: 'kanagawa', x: 0.5, y: 0.8 },
  ],
  chubu: [
    { id: 'niigata', x: 0.7, y: 0.2 },
    { id: 'toyama', x: 0.55, y: 0.25 },
    { id: 'ishikawa', x: 0.4, y: 0.25 },
    { id: 'fukui', x: 0.3, y: 0.45 },
    { id: 'nagano', x: 0.65, y: 0.45 },
    { id: 'yamanashi', x: 0.75, y: 0.6 },
    { id: 'gifu', x: 0.45, y: 0.6 },
    { id: 'aichi', x: 0.4, y: 0.8 },
    { id: 'shizuoka', x: 0.75, y: 0.8 },
  ],
  kansai: [
    { id: 'kyoto', x: 0.5, y: 0.2 },
    { id: 'shiga', x: 0.55, y: 0.35 },
    { id: 'hyogo', x: 0.25, y: 0.35 },
    { id: 'osaka', x: 0.45, y: 0.45 },
    { id: 'nara', x: 0.6, y: 0.55 },
    { id: 'mie', x: 0.65, y: 0.75 },
    { id: 'wakayama', x: 0.45, y: 0.85 },
  ],
  chugoku: [
    { id: 'shimane', x: 0.35, y: 0.35 },
    { id: 'tottori', x: 0.7, y: 0.35 },
    { id: 'hiroshima', x: 0.4, y: 0.65 },
    { id: 'okayama', x: 0.7, y: 0.65 },
    { id: 'yamaguchi', x: 0.1, y: 0.55 },
  ],
  shikoku: [
    { id: 'kagawa', x: 0.6, y: 0.25 },
    { id: 'tokushima', x: 0.75, y: 0.4 },
    { id: 'ehime', x: 0.3, y: 0.5 },
    { id: 'kochi', x: 0.55, y: 0.75 },
  ],
  kyushu: [
    { id: 'fukuoka', x: 0.35, y: 0.2 },
    { id: 'saga', x: 0.25, y: 0.35 },
    { id: 'nagasaki', x: 0.1, y: 0.4 },
    { id: 'oita', x: 0.6, y: 0.4 },
    { id: 'kumamoto', x: 0.3, y: 0.55 },
    { id: 'miyazaki', x: 0.7, y: 0.65 },
    { id: 'kagoshima', x: 0.45, y: 0.85 },
    { id: 'okinawa', x: 0.85, y: 0.95 },
  ],
};

const LABEL_OFFSETS: Record<string, { x: number; y: number }> = {
  hokkaido: { x: -32, y: -60 },
  tohoku: { x: -32, y: -56 },
  kanto: { x: -32, y: -54 },
  chubu: { x: -32, y: -58 },
  kansai: { x: -32, y: -52 },
  chugoku: { x: -32, y: -50 },
  shikoku: { x: -32, y: -54 },
  kyushu: { x: -32, y: -52 },
};

const UI = {
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  } as const,
  mapImage: {
    width: '100%',
    height: 520,
  } as const,
  overlayWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  } as const,
  regionHit: {
    position: 'absolute',
    backgroundColor: 'transparent',
  } as const,
  highlightWrap: {
    position: 'absolute',
  } as const,
  label: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  } as const,
  labelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  } as const,
  prefMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  } as const,
} as const;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function JapanMapInteractive({ onSelect }: JapanMapInteractiveProps) {
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefPhotoIds, setPrefPhotoIds] = useState<Set<string>>(new Set());

  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  const selectedRegion = useMemo(
    () => MAP_REGIONS.find((r) => r.id === selectedId) ?? null,
    [selectedId]
  );

  const anchorPx = useMemo(() => {
    if (!layout || !selectedRegion) return null;
    return {
      x: selectedRegion.anchor.x * layout.width,
      y: selectedRegion.anchor.y * layout.height,
    };
  }, [layout, selectedRegion]);

  const highlightRect = useMemo(() => {
    if (!layout || !selectedRegion) return null;
    const baseWidth = selectedRegion.rect.width * layout.width;
    const baseHeight = selectedRegion.rect.height * layout.height;
    const scaleFactor = 2;
    const width = baseWidth * scaleFactor;
    const height = baseHeight * scaleFactor;
    const left = selectedRegion.rect.x * layout.width - (width - baseWidth) / 2;
    const top = selectedRegion.rect.y * layout.height - (height - baseHeight) / 2;
    return { left, top, width, height };
  }, [layout, selectedRegion]);

  const animateIn = useCallback(() => {
    scale.value = 1;
    translateY.value = 0;
    opacity.value = 0;
    scale.value = withTiming(1.04, { duration: 220 });
    translateY.value = withTiming(-6, { duration: 220 });
    opacity.value = withTiming(1, { duration: 180 });
  }, [opacity, scale, translateY]);

  useEffect(() => {
    if (!selectedRegion) return;
    animateIn();
  }, [selectedRegion, animateIn]);

  const refreshPrefPhotos = useCallback(async () => {
    const list = await getPrefecturePhotos();
    setPrefPhotoIds(new Set(list.map((item) => item.prefectureId)));
  }, []);

  useEffect(() => {
    refreshPrefPhotos();
  }, [refreshPrefPhotos]);

  useFocusEffect(
    useCallback(() => {
      refreshPrefPhotos();
    }, [refreshPrefPhotos])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const selectedPrefMarkers = useMemo(() => {
    if (!layout || !selectedRegion) return [];
    const markers = PREF_MARKERS[selectedRegion.id] ?? [];
    const rectLeft = selectedRegion.rect.x * layout.width;
    const rectTop = selectedRegion.rect.y * layout.height;
    const rectWidth = selectedRegion.rect.width * layout.width;
    const rectHeight = selectedRegion.rect.height * layout.height;
    return markers
      .filter((m) => prefPhotoIds.has(m.id))
      .map((m) => ({
        id: m.id,
        left: rectLeft + m.x * rectWidth,
        top: rectTop + m.y * rectHeight,
      }));
  }, [layout, selectedRegion, prefPhotoIds]);

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!layout) return;
      const tapped = { x, y };
      const rectHits = MAP_REGIONS.filter((region) => {
        const left = region.rect.x * layout.width;
        const top = region.rect.y * layout.height;
        const width = region.rect.width * layout.width;
        const height = region.rect.height * layout.height;
        return x >= left && x <= left + width && y >= top && y <= top + height;
      });

      let chosen: MapRegion | null = null;
      let min = Number.POSITIVE_INFINITY;
      const candidates = rectHits.length > 0 ? rectHits : MAP_REGIONS;
      for (const region of candidates) {
        const anchor = {
          x: region.anchor.x * layout.width,
          y: region.anchor.y * layout.height,
        };
        const d = distance(tapped, anchor);
        if (d < min) {
          min = d;
          chosen = region;
        }
      }
      if (!chosen) return;
      setSelectedId(chosen.id);
      onSelect?.(chosen.id);
    },
    [layout, onSelect]
  );

  return (
    <View
      style={UI.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}>
      <Pressable
        style={{ width: '100%', height: 520 }}
        onPress={(e) => handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
        <Image source={require('@/assets/images/collection-cover.png')} style={UI.mapImage} resizeMode="cover" />
        <View style={UI.overlayWrap}>
          {layout &&
            MAP_REGIONS.map((region) => {
              const left = region.rect.x * layout.width;
              const top = region.rect.y * layout.height;
              const width = region.rect.width * layout.width;
              const height = region.rect.height * layout.height;
              return (
                <Pressable
                  key={region.id}
                  style={[UI.regionHit, { left, top, width, height }]}
                  onPress={(e) => {
                    const x = left + e.nativeEvent.locationX;
                    const y = top + e.nativeEvent.locationY;
                    handleTap(x, y);
                  }}
                />
              );
            })}
          {selectedRegion && highlightRect && (
            <>
              <Animated.View
                style={[
                  UI.highlightWrap,
                  {
                    left: highlightRect.left,
                    top: highlightRect.top,
                    width: highlightRect.width,
                    height: highlightRect.height,
                  },
                  animatedStyle,
                ]}>
                <Image
                  source={selectedRegion.highlightImage}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </Animated.View>
              {selectedPrefMarkers.map((marker) => (
                <View
                  key={marker.id}
                  pointerEvents="none"
                  style={[
                    UI.prefMarker,
                    { left: marker.left - 6, top: marker.top - 6 },
                  ]}
                />
              ))}
              {anchorPx && (
                <Animated.View
                  style={[
                    UI.label,
                    {
                      left: anchorPx.x + (LABEL_OFFSETS[selectedRegion.id]?.x ?? -32),
                      top: anchorPx.y + (LABEL_OFFSETS[selectedRegion.id]?.y ?? -54),
                    },
                    labelStyle,
                  ]}>
                  <Text style={UI.labelText}>{selectedRegion.name}</Text>
                </Animated.View>
              )}
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
}
