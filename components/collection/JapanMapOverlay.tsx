import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { geoMercator, geoPath } from 'd3-geo';

import japanLow from '@amcharts/amcharts4-geodata/japanLow';

type Props = {
  width: number;
  height: number;
  visitedPrefectures: Set<string>;
  selectedPrefecture: string | null;
};

const PREF_CODE_BY_ID: Record<string, string> = {
  'JP-01': 'hokkaido',
  'JP-02': 'aomori',
  'JP-03': 'iwate',
  'JP-04': 'miyagi',
  'JP-05': 'akita',
  'JP-06': 'yamagata',
  'JP-07': 'fukushima',
  'JP-08': 'ibaraki',
  'JP-09': 'tochigi',
  'JP-10': 'gunma',
  'JP-11': 'saitama',
  'JP-12': 'chiba',
  'JP-13': 'tokyo',
  'JP-14': 'kanagawa',
  'JP-15': 'niigata',
  'JP-16': 'toyama',
  'JP-17': 'ishikawa',
  'JP-18': 'fukui',
  'JP-19': 'yamanashi',
  'JP-20': 'nagano',
  'JP-21': 'gifu',
  'JP-22': 'shizuoka',
  'JP-23': 'aichi',
  'JP-24': 'mie',
  'JP-25': 'shiga',
  'JP-26': 'kyoto',
  'JP-27': 'osaka',
  'JP-28': 'hyogo',
  'JP-29': 'nara',
  'JP-30': 'wakayama',
  'JP-31': 'tottori',
  'JP-32': 'shimane',
  'JP-33': 'okayama',
  'JP-34': 'hiroshima',
  'JP-35': 'yamaguchi',
  'JP-36': 'tokushima',
  'JP-37': 'kagawa',
  'JP-38': 'ehime',
  'JP-39': 'kochi',
  'JP-40': 'fukuoka',
  'JP-41': 'saga',
  'JP-42': 'nagasaki',
  'JP-43': 'kumamoto',
  'JP-44': 'oita',
  'JP-45': 'miyazaki',
  'JP-46': 'kagoshima',
  'JP-47': 'okinawa',
};

type GeoJsonFeature = {
  id?: string;
  properties?: { id?: string };
};

export function JapanMapOverlay({ width, height, visitedPrefectures, selectedPrefecture }: Props) {
  const features = useMemo(() => {
    const geo = (japanLow as any).default ?? japanLow;
    return geo?.features ?? [];
  }, []);

  const paths = useMemo(() => {
    const projection = geoMercator().fitSize([width, height], {
      type: 'FeatureCollection',
      features,
    });
    const pathGen = geoPath(projection);
    return features
      .map((feature: GeoJsonFeature) => {
        const featureId = feature.id || feature.properties?.id;
        const prefCode = featureId ? PREF_CODE_BY_ID[featureId] : undefined;
        const d = pathGen(feature as any);
        return d ? { d, prefCode, id: featureId } : null;
      })
      .filter(Boolean) as { d: string; prefCode?: string; id?: string }[];
  }, [features, height, width]);

  return (
    <Svg width={width} height={height} pointerEvents="none">
      {paths.map((item) => {
        const isSelected = !!item.prefCode && item.prefCode === selectedPrefecture;
        const isVisited = !!item.prefCode && visitedPrefectures.has(item.prefCode);
        const fill = isSelected
          ? 'rgba(236, 72, 153, 0.75)'
          : isVisited
            ? 'rgba(236, 72, 153, 0.5)'
            : 'transparent';
        const stroke = isSelected ? 'rgba(236, 72, 153, 0.9)' : 'transparent';
        return (
          <Path
            key={item.id ?? item.d}
            d={item.d}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
          />
        );
      })}
    </Svg>
  );
}
