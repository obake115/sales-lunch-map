type BBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

const PREFECTURES: Record<string, BBox> = {
  hokkaido:   { minLat: 41.34, maxLat: 45.56, minLng: 139.33, maxLng: 145.82 },
  aomori:     { minLat: 40.22, maxLat: 41.56, minLng: 139.49, maxLng: 141.69 },
  iwate:      { minLat: 38.75, maxLat: 40.45, minLng: 140.65, maxLng: 142.08 },
  miyagi:     { minLat: 37.77, maxLat: 39.00, minLng: 140.27, maxLng: 141.68 },
  akita:      { minLat: 39.07, maxLat: 40.52, minLng: 139.69, maxLng: 140.99 },
  yamagata:   { minLat: 37.73, maxLat: 39.21, minLng: 139.52, maxLng: 140.64 },
  fukushima:  { minLat: 36.79, maxLat: 37.97, minLng: 139.16, maxLng: 141.05 },
  ibaraki:    { minLat: 35.74, maxLat: 36.96, minLng: 139.69, maxLng: 140.85 },
  tochigi:    { minLat: 36.20, maxLat: 37.16, minLng: 139.33, maxLng: 140.29 },
  gunma:      { minLat: 36.05, maxLat: 37.07, minLng: 138.64, maxLng: 139.69 },
  saitama:    { minLat: 35.77, maxLat: 36.29, minLng: 138.91, maxLng: 139.91 },
  chiba:      { minLat: 34.90, maxLat: 36.11, minLng: 139.75, maxLng: 140.87 },
  tokyo:      { minLat: 35.50, maxLat: 35.90, minLng: 138.94, maxLng: 139.92 },
  kanagawa:   { minLat: 35.13, maxLat: 35.67, minLng: 138.91, maxLng: 139.79 },
  niigata:    { minLat: 36.74, maxLat: 38.56, minLng: 137.64, maxLng: 140.05 },
  toyama:     { minLat: 36.27, maxLat: 36.99, minLng: 136.77, maxLng: 137.76 },
  ishikawa:   { minLat: 36.08, maxLat: 37.85, minLng: 136.23, maxLng: 137.40 },
  fukui:      { minLat: 35.37, maxLat: 36.30, minLng: 135.53, maxLng: 136.83 },
  yamanashi:  { minLat: 35.21, maxLat: 35.87, minLng: 138.18, maxLng: 139.15 },
  nagano:     { minLat: 35.21, maxLat: 37.03, minLng: 137.32, maxLng: 138.73 },
  gifu:       { minLat: 35.14, maxLat: 36.47, minLng: 136.26, maxLng: 137.65 },
  shizuoka:   { minLat: 34.58, maxLat: 35.64, minLng: 137.49, maxLng: 139.17 },
  aichi:      { minLat: 34.57, maxLat: 35.43, minLng: 136.67, maxLng: 137.84 },
  mie:        { minLat: 33.73, maxLat: 35.18, minLng: 135.85, maxLng: 136.99 },
  shiga:      { minLat: 34.82, maxLat: 35.70, minLng: 135.77, maxLng: 136.45 },
  kyoto:      { minLat: 34.78, maxLat: 35.78, minLng: 134.85, maxLng: 136.07 },
  osaka:      { minLat: 34.27, maxLat: 34.98, minLng: 135.09, maxLng: 135.68 },
  hyogo:      { minLat: 34.15, maxLat: 35.68, minLng: 134.26, maxLng: 135.47 },
  nara:       { minLat: 33.85, maxLat: 34.77, minLng: 135.57, maxLng: 136.23 },
  wakayama:   { minLat: 33.43, maxLat: 34.38, minLng: 135.07, maxLng: 136.01 },
  tottori:    { minLat: 35.08, maxLat: 35.62, minLng: 133.15, maxLng: 134.52 },
  shimane:    { minLat: 34.30, maxLat: 37.25, minLng: 131.66, maxLng: 133.39 },
  okayama:    { minLat: 34.38, maxLat: 35.35, minLng: 133.34, maxLng: 134.41 },
  hiroshima:  { minLat: 34.05, maxLat: 35.13, minLng: 132.04, maxLng: 133.40 },
  yamaguchi:  { minLat: 33.74, maxLat: 34.77, minLng: 130.82, maxLng: 132.27 },
  tokushima:  { minLat: 33.72, maxLat: 34.26, minLng: 133.56, maxLng: 134.81 },
  kagawa:     { minLat: 34.11, maxLat: 34.53, minLng: 133.48, maxLng: 134.45 },
  ehime:      { minLat: 32.90, maxLat: 34.00, minLng: 132.01, maxLng: 133.70 },
  kochi:      { minLat: 32.71, maxLat: 33.88, minLng: 132.47, maxLng: 134.31 },
  fukuoka:    { minLat: 33.00, maxLat: 33.97, minLng: 130.02, maxLng: 131.19 },
  saga:       { minLat: 32.97, maxLat: 33.60, minLng: 129.73, maxLng: 130.56 },
  nagasaki:   { minLat: 32.57, maxLat: 34.73, minLng: 128.60, maxLng: 130.33 },
  kumamoto:   { minLat: 32.07, maxLat: 33.19, minLng: 130.10, maxLng: 131.32 },
  oita:       { minLat: 32.72, maxLat: 33.75, minLng: 130.82, maxLng: 132.12 },
  miyazaki:   { minLat: 31.36, maxLat: 32.83, minLng: 130.69, maxLng: 131.88 },
  kagoshima:  { minLat: 27.01, maxLat: 32.33, minLng: 128.40, maxLng: 131.32 },
  okinawa:    { minLat: 24.05, maxLat: 27.89, minLng: 122.93, maxLng: 131.33 },
};

/**
 * Look up the prefecture ID for a given coordinate.
 * Uses bounding-box matching. When multiple prefectures overlap,
 * returns the smallest-area match for better precision.
 */
export function coordToPrefectureId(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestArea = Infinity;

  for (const [id, box] of Object.entries(PREFECTURES)) {
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      const area = (box.maxLat - box.minLat) * (box.maxLng - box.minLng);
      if (area < bestArea) {
        bestArea = area;
        best = id;
      }
    }
  }

  return best;
}

export function getPrefectureBounds(prefectureId: string): BBox | null {
  return PREFECTURES[prefectureId] ?? null;
}
