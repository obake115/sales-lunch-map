import type { ImageSourcePropType } from 'react-native';

export type MapBackgroundId = 'none' | 'sakura' | 'seasonal' | 'stamp' | 'navy' | 'washi' | 'pastel';

export type MapBackground = {
  id: MapBackgroundId;
  labelKey: string;
  source: ImageSourcePropType | null;
  premium: boolean;
};

/** Free backgrounds first, then premium */
export const MAP_BACKGROUNDS: MapBackground[] = [
  // ── 無料 ──
  { id: 'none', labelKey: 'collection.bgNone', source: null, premium: false },
  { id: 'washi', labelKey: 'collection.bgWashi', source: require('@/assets/images/backgrounds/bg_washi.png'), premium: false },
  { id: 'stamp', labelKey: 'collection.bgStamp', source: require('@/assets/images/backgrounds/bg_stamp.png'), premium: false },
  { id: 'pastel', labelKey: 'collection.bgPastel', source: require('@/assets/images/backgrounds/bg_pastel.png'), premium: false },
  // ── 有料（プレミアム） ──
  { id: 'sakura', labelKey: 'collection.bgSakura', source: require('@/assets/images/backgrounds/bg_sakura.png'), premium: true },
  { id: 'seasonal', labelKey: 'collection.bgSeasonal', source: require('@/assets/images/backgrounds/bg_seasonal.png'), premium: true },
  { id: 'navy', labelKey: 'collection.bgNavy', source: require('@/assets/images/backgrounds/bg_navy.png'), premium: true },
];

export function getMapBackground(id: MapBackgroundId): MapBackground {
  return MAP_BACKGROUNDS.find((bg) => bg.id === id) ?? MAP_BACKGROUNDS[0];
}
