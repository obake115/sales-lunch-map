import { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

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

const AnimatedPath = Animated.createAnimatedComponent(Path);

type JapanMapInteractiveProps = {
  /** Called with the prefecture id (e.g. "hokkaido") when tapped. */
  onSelect?: (prefId: string) => void;
  /** Called when the map background (outside any prefecture) is tapped. */
  onBackgroundPress?: () => void;
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
  /** Enable gentle breathing animation. */
  breathing?: boolean;
  /** Subset of visited prefs that should breathe (e.g. count >= 3).
   *  When omitted, all visited prefs breathe. */
  breathingPrefs?: Set<string>;
};

export function JapanMapInteractive({
  onSelect,
  onBackgroundPress,
  selectedPref = null,
  visitedPrefs,
  height = 520,
  fillDefault = '#fff',
  fillSelected = 'rgba(236, 72, 153, 0.75)',
  fillVisited = 'rgba(236, 72, 153, 0.5)',
  stroke = '#000',
  strokeWidth = 1,
  breathing = false,
  breathingPrefs,
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

  // ── Breathing animation (shared value across all breathing prefs) ──
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!breathing) {
      breath.value = 0;
      return;
    }
    const targetSize = breathingPrefs?.size ?? visitedPrefs?.size ?? 0;
    if (!targetSize) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breathing, breathingPrefs?.size, visitedPrefs?.size, breath]);

  // fillOpacity 0.78 → 0.92 (gentle, not flashy)
  const fillAnimProps = useAnimatedProps(() => ({
    fillOpacity: 0.78 + 0.14 * breath.value,
  }));

  // Glow stroke: strokeOpacity 0.05 → 0.25
  const glowAnimProps = useAnimatedProps(() => ({
    strokeOpacity: 0.05 + 0.20 * breath.value,
  }));

  return (
    <View style={{ width: '100%', aspectRatio: 1, maxHeight: height }}>
      <Svg viewBox={SVG_VIEWBOX} width="100%" height="100%">
        {/* Background tap target */}
        <Rect x="0" y="0" width="1000" height="1000" fill="transparent" onPress={onBackgroundPress} />
        {PREFECTURES.map((pref, pi) => {
          const fill = getFill(pref.id);
          const t = transforms[pi];
          const isVisited = visitedPrefs?.has(pref.id) && pref.id !== selectedPref;
          const shouldAnimate =
            breathing && isVisited && (!breathingPrefs || breathingPrefs.has(pref.id));

          return pref.d.flatMap((d, di) => {
            if (shouldAnimate) {
              return [
                // Glow layer (underneath)
                <AnimatedPath
                  key={`glow-${pref.id}-${di}`}
                  d={d}
                  transform={t}
                  fill="transparent"
                  stroke={fillVisited}
                  strokeWidth={strokeWidth + 3}
                  strokeLinejoin="round"
                  animatedProps={glowAnimProps}
                />,
                // Fill layer with breathing
                <AnimatedPath
                  key={`${pref.id}-${di}`}
                  d={d}
                  transform={t}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  fillRule="nonzero"
                  onPress={() => handlePress(pref.id)}
                  animatedProps={fillAnimProps}
                />,
              ];
            }
            return [
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
              />,
            ];
          });
        })}
      </Svg>
    </View>
  );
}
