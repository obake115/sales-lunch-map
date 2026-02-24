import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { WeatherTone } from '@/src/weather';

const toneColors: Record<WeatherTone, { color: string; opacity: number }> = {
  sunny:   { color: '#FBBF24', opacity: 0.22 },  // warm amber / sunshine
  cloudy:  { color: '#9CA3AF', opacity: 0.16 },  // muted gray
  rain:    { color: '#60A5FA', opacity: 0.18 },   // soft blue
  default: { color: '#F6F1E8', opacity: 0 },
};

type Props = {
  tone: WeatherTone;
};

export function WeatherBackdrop({ tone }: Props) {
  const { color, opacity } = toneColors[tone] ?? toneColors.default;

  return (
    <Svg
      style={styles.gradient}
      width="100%"
      height="340"
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="weatherGrad" x1="20%" y1="0%" x2="80%" y2="60%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor="#F6F1E8" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#weatherGrad)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    zIndex: 1,
  },
});
