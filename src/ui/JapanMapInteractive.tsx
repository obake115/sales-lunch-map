import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  PREFECTURES,
  SVG_VIEWBOX,
  type PrefecturePathData,
} from './prefecturePathData';

// Pre-computed combined matrix per prefecture.
// Combines: outer matrix(1.028807,0,0,1.028807,-47.544239,-28.806583)
//         + group translate(6,18)
//         + per-pref translate(tx,ty)
// Result:  matrix(s,0,0,s, s*(tx+6)+mx, s*(ty+18)+my)
const S = 1.028807;
const MX = -47.544239;
const MY = -28.806583;

function prefTransform(pref: PrefecturePathData): string {
  const e = S * (pref.translate[0] + 6) + MX;
  const f = S * (pref.translate[1] + 18) + MY;
  return `matrix(${S},0,0,${S},${e},${f})`;
}

type JapanMapInteractiveProps = {
  /** Called with the prefecture id (e.g. "hokkaido") when tapped. */
  onSelect?: (prefId: string) => void;
  /** Currently selected prefecture id — highlighted with fillSelected. */
  selectedPref?: string | null;
  /** Set of visited prefecture ids — filled with fillVisited. */
  visitedPrefs?: Set<string>;
  height?: number;
  fillDefault?: string;
  fillSelected?: string;
  fillVisited?: string;
  stroke?: string;
  strokeWidth?: number;
};

export function JapanMapInteractive({
  onSelect,
  selectedPref = null,
  visitedPrefs,
  height = 520,
  fillDefault = '#fff',
  fillSelected = 'rgba(236, 72, 153, 0.75)',
  fillVisited = 'rgba(236, 72, 153, 0.5)',
  stroke = '#000',
  strokeWidth = 1,
}: JapanMapInteractiveProps) {
  const transforms = useMemo(
    () => PREFECTURES.map((p) => prefTransform(p)),
    [],
  );

  const getFill = useCallback(
    (id: string) => {
      if (id === selectedPref) return fillSelected;
      if (visitedPrefs?.has(id)) return fillVisited;
      return fillDefault;
    },
    [selectedPref, visitedPrefs, fillDefault, fillSelected, fillVisited],
  );

  const handlePress = useCallback(
    (prefId: string) => {
      onSelect?.(prefId);
    },
    [onSelect],
  );

  return (
    <View style={{ width: '100%', aspectRatio: 1, maxHeight: height }}>
      <Svg viewBox={SVG_VIEWBOX} width="100%" height="100%">
        {PREFECTURES.map((pref, pi) => {
          const fill = getFill(pref.id);
          const t = transforms[pi];
          return pref.d.map((d, di) => (
            <Path
              key={`${pref.id}-${di}`}
              d={d}
              transform={t}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              fillRule="nonzero"
              onPress={() => handlePress(pref.id)}
            />
          ));
        })}
      </Svg>
    </View>
  );
}
