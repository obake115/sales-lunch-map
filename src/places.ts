export type PlaceSearchResult = {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
};

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function searchPlaces(
  query: string,
  options?: { location?: { latitude: number; longitude: number }; radiusMeters?: number }
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places APIキーが設定されていません。');
  }

  const params = new URLSearchParams({
    query: trimmed,
    key: GOOGLE_PLACES_API_KEY,
    language: 'ja',
  });

  if (options?.location) {
    params.set('location', `${options.location.latitude},${options.location.longitude}`);
    params.set('radius', String(options.radiusMeters ?? 2000));
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message ?? '検索に失敗しました。');
  }

  if (!Array.isArray(data.results)) return [];

  return data.results
    .map((r: any) => {
      const lat = r?.geometry?.location?.lat;
      const lng = r?.geometry?.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      const placeId = typeof r?.place_id === 'string' ? r.place_id : '';
      const name = typeof r?.name === 'string' ? r.name : '';
      if (!placeId || !name) return null;
      return {
        placeId,
        name,
        latitude: lat,
        longitude: lng,
        address: typeof r?.formatted_address === 'string' ? r.formatted_address : undefined,
      } as PlaceSearchResult;
    })
    .filter(Boolean) as PlaceSearchResult[];
}
