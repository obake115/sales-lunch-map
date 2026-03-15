/**
 * 47都道府県の名物バッジ地図上配置座標
 * viewBox="0 0 1000 1000" の日本地図SVG基準
 * SVGパスデータの重心（centroid）から自動算出
 */

export type FoodBadgePosition = {
  prefectureId: string;
  /** x position in SVG viewBox (0–1000) */
  x: number;
  /** y position in SVG viewBox (0–1000) */
  y: number;
  /** Optional scale override (default 1.0) */
  scale?: number;
};

export const FOOD_BADGE_POSITIONS: FoodBadgePosition[] = [
  // ── 北海道 ──
  { prefectureId: 'hokkaido', x: 704, y: 188, scale: 1.05 },

  // ── 東北 ──
  { prefectureId: 'aomori', x: 645, y: 335 },
  { prefectureId: 'iwate', x: 685, y: 417 },
  { prefectureId: 'miyagi', x: 666, y: 485 },
  { prefectureId: 'akita', x: 629, y: 399 },
  { prefectureId: 'yamagata', x: 617, y: 494 },
  { prefectureId: 'fukushima', x: 619, y: 546 },

  // ── 関東（密集エリア） ──
  { prefectureId: 'ibaraki', x: 631, y: 623, scale: 0.85 },
  { prefectureId: 'tochigi', x: 604, y: 604, scale: 0.85 },
  { prefectureId: 'gunma', x: 562, y: 611, scale: 0.85 },
  { prefectureId: 'saitama', x: 586, y: 645, scale: 0.82 },
  { prefectureId: 'chiba', x: 619, y: 675, scale: 0.82 },
  { prefectureId: 'tokyo', x: 592, y: 663, scale: 0.82 },
  { prefectureId: 'kanagawa', x: 586, y: 683, scale: 0.82 },

  // ── 中部 ──
  { prefectureId: 'niigata', x: 555, y: 557 },
  { prefectureId: 'toyama', x: 469, y: 605 },
  { prefectureId: 'ishikawa', x: 452, y: 590 },
  { prefectureId: 'fukui', x: 409, y: 663 },
  { prefectureId: 'yamanashi', x: 541, y: 670 },
  { prefectureId: 'nagano', x: 516, y: 634 },
  { prefectureId: 'gifu', x: 462, y: 660 },
  { prefectureId: 'shizuoka', x: 538, y: 705 },
  { prefectureId: 'aichi', x: 466, y: 712, scale: 0.9 },

  // ── 近畿（密集エリア） ──
  { prefectureId: 'mie', x: 425, y: 749, scale: 0.85 },
  { prefectureId: 'shiga', x: 413, y: 690, scale: 0.85 },
  { prefectureId: 'kyoto', x: 375, y: 689, scale: 0.85 },
  { prefectureId: 'osaka', x: 377, y: 727, scale: 0.85 },
  { prefectureId: 'hyogo', x: 344, y: 701, scale: 0.85 },
  { prefectureId: 'nara', x: 401, y: 752, scale: 0.82 },
  { prefectureId: 'wakayama', x: 377, y: 778, scale: 0.85 },

  // ── 中国 ──
  { prefectureId: 'tottori', x: 284, y: 685 },
  { prefectureId: 'shimane', x: 218, y: 708 },
  { prefectureId: 'okayama', x: 291, y: 714 },
  { prefectureId: 'hiroshima', x: 234, y: 732 },
  { prefectureId: 'yamaguchi', x: 170, y: 749 },

  // ── 四国 ──
  { prefectureId: 'tokushima', x: 313, y: 774 },
  { prefectureId: 'kagawa', x: 298, y: 756 },
  { prefectureId: 'ehime', x: 228, y: 805 },
  { prefectureId: 'kochi', x: 258, y: 813 },

  // ── 九州 ──
  { prefectureId: 'fukuoka', x: 117, y: 790 },
  { prefectureId: 'saga', x: 85, y: 801 },
  { prefectureId: 'nagasaki', x: 73, y: 821 },
  { prefectureId: 'kumamoto', x: 122, y: 844 },
  { prefectureId: 'oita', x: 164, y: 819 },
  { prefectureId: 'miyazaki', x: 150, y: 875 },
  { prefectureId: 'kagoshima', x: 110, y: 915 },

  // ── 沖縄 ──
  { prefectureId: 'okinawa', x: 310, y: 210, scale: 0.9 },
];

const positionMap = new Map<string, FoodBadgePosition>();
for (const pos of FOOD_BADGE_POSITIONS) {
  positionMap.set(pos.prefectureId, pos);
}

export function getFoodBadgePosition(prefId: string): FoodBadgePosition | undefined {
  return positionMap.get(prefId);
}
