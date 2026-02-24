import { useEffect, useMemo, useState } from 'react';

import { fetchWeatherTone, type WeatherTone } from '@/src/weather';

type Params = {
  isNavy: boolean;
  lat: number | null;
  lon: number | null;
};

export function useEveryoneTone({ isNavy, lat, lon }: Params) {
  const [weatherTone, setWeatherTone] = useState<WeatherTone>('default');
  const [weatherLabel, setWeatherLabel] = useState('');
  const [tempC, setTempC] = useState<number | null>(null);

  useEffect(() => {
    if (lat == null || lon == null) return;
    fetchWeatherTone(lat, lon).then((result) => {
      setWeatherTone(result.tone);
      setWeatherLabel(result.label);
      setTempC(result.tempC);
    });
  }, [lat, lon]);

  const resolvedTone: WeatherTone = useMemo(() => {
    if (isNavy) return 'default';
    return weatherTone;
  }, [isNavy, weatherTone]);

  const resolvedLabel = useMemo(() => {
    const tempText = typeof tempC === 'number' ? ` ${Math.round(tempC)}\u2103` : '';
    return weatherLabel ? `${weatherLabel}${tempText}` : '';
  }, [weatherLabel, tempC]);

  return { resolvedTone, resolvedLabel };
}
