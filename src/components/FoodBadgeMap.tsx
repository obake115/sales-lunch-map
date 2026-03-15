import React, { useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { PREFECTURES, SVG_VIEWBOX } from '@/src/ui/prefecturePathData';
import { FOOD_BADGE_POSITIONS } from '@/src/domain/foodBadgePositions';
import { getFoodBadge } from '@/src/domain/foodBadges';

const S = 1.028807;
const MX = -47.544239;
const MY = -28.806583;

function prefTransform(translate: [number, number]): string {
  const e = S * (translate[0] + 6) + MX;
  const f = S * (translate[1] + 18) + MY;
  return `matrix(${S},0,0,${S},${e},${f})`;
}

type FoodBadgeMapProps = {
  /** Set of prefecture IDs that should show badge images on the map */
  visibleBadges: Set<string>;
  height?: number;
  /** Badge image size in pixels (default 56) */
  badgeSize?: number;
  /** Base map fill color */
  fillDefault?: string;
  /** Stroke color */
  stroke?: string;
  /** Fill for prefectures that have earned (visible) badges */
  fillEarned?: string;
};

export function FoodBadgeMap({
  visibleBadges,
  height = 340,
  badgeSize = 56,
  fillDefault = '#D5D0C6',
  stroke = '#FFFFFF',
  fillEarned = '#FDE68A',
}: FoodBadgeMapProps) {
  const [layoutSize, setLayoutSize] = useState(0);
  const transforms = React.useMemo(
    () => PREFECTURES.map((p) => prefTransform(p.translate)),
    [],
  );

  return (
    <View
      style={{ width: '100%', aspectRatio: 1, maxHeight: height, position: 'relative' }}
      onLayout={(e) => setLayoutSize(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))}
    >
      {/* SVG map base */}
      <Svg viewBox={SVG_VIEWBOX} width="100%" height="100%">
        <Rect x="0" y="0" width="1000" height="1000" fill="transparent" />
        {PREFECTURES.map((pref, pi) => {
          const fill = visibleBadges.has(pref.id) ? fillEarned : fillDefault;
          const t = transforms[pi];
          return pref.d.map((d, di) => (
            <Path
              key={`${pref.id}-${di}`}
              d={d}
              transform={t}
              fill={fill}
              stroke={stroke}
              strokeWidth={1}
              strokeLinejoin="round"
              fillRule="nonzero"
            />
          ));
        })}
      </Svg>

      {/* Badge images overlaid on map */}
      {layoutSize > 0 && FOOD_BADGE_POSITIONS.map((pos) => {
        if (!visibleBadges.has(pos.prefectureId)) return null;
        const badge = getFoodBadge(pos.prefectureId);
        if (!badge) return null;

        const scale = pos.scale ?? 1;
        const size = badgeSize * scale;
        const left = (pos.x / 1000) * layoutSize - size / 2;
        const top = (pos.y / 1000) * layoutSize - size / 2;

        return (
          <Image
            key={pos.prefectureId}
            source={badge.imageSource}
            style={{
              position: 'absolute',
              left,
              top,
              width: size,
              height: size,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
            resizeMode="contain"
          />
        );
      })}
    </View>
  );
}
