import { t } from '@/src/i18n';

export type MapRegion = {
  id: string;
  name: string;
  anchor: { x: number; y: number };
  rect: { x: number; y: number; width: number; height: number };
  hitPadding?: number;
  highlightImage: any;
};

export const MAP_REGIONS: MapRegion[] = [
  {
    id: 'hokkaido',
    name: t('regions.hokkaido'),
    anchor: { x: 0.74, y: 0.12 },
    rect: { x: 0.62, y: 0.04, width: 0.28, height: 0.2 },
    highlightImage: require('@/assets/images/hokkaido-highlight.png'),
  },
  {
    id: 'tohoku',
    name: t('regions.tohoku'),
    anchor: { x: 0.62, y: 0.27 },
    rect: { x: 0.54, y: 0.2, width: 0.2, height: 0.16 },
    highlightImage: require('@/assets/images/tohoku-highlight.png'),
  },
  {
    id: 'kanto',
    name: t('regions.kanto'),
    anchor: { x: 0.58, y: 0.42 },
    rect: { x: 0.52, y: 0.36, width: 0.18, height: 0.14 },
    highlightImage: require('@/assets/images/kanto-highlight.png'),
  },
  {
    id: 'chubu',
    name: t('regions.chubu'),
    anchor: { x: 0.5, y: 0.41 },
    rect: { x: 0.42, y: 0.32, width: 0.22, height: 0.16 },
    highlightImage: require('@/assets/images/chubu-highlight.png'),
  },
  {
    id: 'kansai',
    name: t('regions.kansai'),
    anchor: { x: 0.38, y: 0.48 },
    rect: { x: 0.32, y: 0.42, width: 0.16, height: 0.12 },
    highlightImage: require('@/assets/images/kansai-highlight.png'),
  },
  {
    id: 'chugoku',
    name: t('regions.chugoku'),
    anchor: { x: 0.26, y: 0.48 },
    rect: { x: 0.18, y: 0.44, width: 0.16, height: 0.12 },
    highlightImage: require('@/assets/images/chugoku-highlight.png'),
  },
  {
    id: 'shikoku',
    name: t('regions.shikoku'),
    anchor: { x: 0.3, y: 0.56 },
    rect: { x: 0.24, y: 0.54, width: 0.14, height: 0.08 },
    highlightImage: require('@/assets/images/shikoku-highlight.png'),
  },
  {
    id: 'kyushu',
    name: t('regions.kyushu'),
    anchor: { x: 0.2, y: 0.68 },
    rect: { x: 0.12, y: 0.62, width: 0.18, height: 0.18 },
    highlightImage: require('@/assets/images/kyushu-highlight.png'),
  },
];
