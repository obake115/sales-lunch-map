import { t } from '@/src/i18n';

export type WeatherTone = 'sunny' | 'cloudy' | 'rain' | 'default';

export type WeatherResult = {
  tone: WeatherTone;
  label: string;
  tempC: number | null;
};

/* ── 30-minute cache ── */
let cache: (WeatherResult & { ts: number }) | null = null;
const CACHE_MS = 30 * 60 * 1000;

/** WMO weather code → WeatherTone */
function wmoToTone(code: number): WeatherTone {
  if (code <= 1) return 'sunny';
  if (code <= 3 || code === 45 || code === 48) return 'cloudy';
  // 51-67 drizzle/rain, 71-86 snow, 95-99 thunderstorm
  if ((code >= 51 && code <= 67) || (code >= 71 && code <= 86) || (code >= 95 && code <= 99)) return 'rain';
  return 'default';
}

function toneLabel(tone: WeatherTone): string {
  switch (tone) {
    case 'sunny':  return t('everyone.weatherSunny');
    case 'cloudy': return t('everyone.weatherCloudy');
    case 'rain':   return t('everyone.weatherRain');
    default:       return '';
  }
}

export async function fetchWeatherTone(
  lat: number,
  lon: number,
): Promise<WeatherResult> {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return { tone: cache.tone, label: cache.label, tempC: cache.tempC };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m`;
    const res = await fetch(url);
    const json = await res.json();
    const code: number = json?.current?.weather_code ?? -1;
    const rawTemp = json?.current?.temperature_2m;
    const tone = wmoToTone(code);
    const label = toneLabel(tone);
    const tempC = typeof rawTemp === 'number' ? rawTemp : null;
    cache = { tone, label, tempC, ts: Date.now() };
    return { tone, label, tempC };
  } catch {
    return { tone: 'default', label: '', tempC: null };
  }
}
