/**
 * 47都道府県 × 名物バッジ定義
 * prefId は prefectureLookup.ts と完全一致
 */

import type { ImageSourcePropType } from 'react-native';

export type FoodBadge = {
  prefId: string;
  foodNameJa: string;
  foodNameEn: string;
  imageSource: ImageSourcePropType;
};

const FOOD_BADGES: FoodBadge[] = [
  { prefId: 'hokkaido', foodNameJa: 'ラーメン', foodNameEn: 'Ramen', imageSource: require('@/assets/badges/hokkaido_ramen.png') },
  { prefId: 'aomori', foodNameJa: 'りんご', foodNameEn: 'Apple', imageSource: require('@/assets/badges/aomori_apple.png') },
  { prefId: 'iwate', foodNameJa: 'わんこそば', foodNameEn: 'Wanko Soba', imageSource: require('@/assets/badges/iwate_wanko_soba.png') },
  { prefId: 'miyagi', foodNameJa: '牛タン', foodNameEn: 'Beef Tongue', imageSource: require('@/assets/badges/miyagi_beef_tongue.png') },
  { prefId: 'akita', foodNameJa: 'きりたんぽ', foodNameEn: 'Kiritanpo', imageSource: require('@/assets/badges/akita_kiritanpo.png') },
  { prefId: 'yamagata', foodNameJa: 'さくらんぼ', foodNameEn: 'Cherry', imageSource: require('@/assets/badges/yamagata_cherry.png') },
  { prefId: 'fukushima', foodNameJa: '喜多方ラーメン', foodNameEn: 'Kitakata Ramen', imageSource: require('@/assets/badges/fukushima_ramen.png') },
  { prefId: 'ibaraki', foodNameJa: '納豆', foodNameEn: 'Natto', imageSource: require('@/assets/badges/ibaraki_natto.png') },
  { prefId: 'tochigi', foodNameJa: '宇都宮餃子', foodNameEn: 'Utsunomiya Gyoza', imageSource: require('@/assets/badges/tochigi_gyoza.png') },
  { prefId: 'gunma', foodNameJa: '焼きまんじゅう', foodNameEn: 'Yaki Manju', imageSource: require('@/assets/badges/gunma_yaki_manju.png') },
  { prefId: 'saitama', foodNameJa: '草加せんべい', foodNameEn: 'Soka Rice Crackers', imageSource: require('@/assets/badges/saitama_rice_crackers.png') },
  { prefId: 'chiba', foodNameJa: '落花生', foodNameEn: 'Peanuts', imageSource: require('@/assets/badges/chiba_peanuts.png') },
  { prefId: 'tokyo', foodNameJa: '寿司', foodNameEn: 'Sushi', imageSource: require('@/assets/badges/tokyo_sushi.png') },
  { prefId: 'kanagawa', foodNameJa: 'シウマイ', foodNameEn: 'Shumai', imageSource: require('@/assets/badges/kanagawa_shumai.png') },
  { prefId: 'niigata', foodNameJa: 'コシヒカリ', foodNameEn: 'Koshihikari Rice', imageSource: require('@/assets/badges/niigata_rice_bowl.png') },
  { prefId: 'toyama', foodNameJa: 'ますの寿し', foodNameEn: 'Trout Sushi', imageSource: require('@/assets/badges/toyama_trout_sushi.png') },
  { prefId: 'ishikawa', foodNameJa: '金沢カレー', foodNameEn: 'Kanazawa Curry', imageSource: require('@/assets/badges/ishikawa_kanazawa_curry.png') },
  { prefId: 'fukui', foodNameJa: '越前そば', foodNameEn: 'Echizen Soba', imageSource: require('@/assets/badges/fukui_echizen_soba.png') },
  { prefId: 'yamanashi', foodNameJa: 'ほうとう', foodNameEn: 'Houtou', imageSource: require('@/assets/badges/yamanashi_houtou_noodles.png') },
  { prefId: 'nagano', foodNameJa: '信州そば', foodNameEn: 'Shinshu Soba', imageSource: require('@/assets/badges/nagano_shinshu_soba.png') },
  { prefId: 'gifu', foodNameJa: '飛騨牛', foodNameEn: 'Hida Beef', imageSource: require('@/assets/badges/gifu_hida_beef.png') },
  { prefId: 'shizuoka', foodNameJa: 'うなぎ', foodNameEn: 'Grilled Eel', imageSource: require('@/assets/badges/shizuoka_grilled_eel.png') },
  { prefId: 'aichi', foodNameJa: '味噌カツ', foodNameEn: 'Miso Katsu', imageSource: require('@/assets/badges/aichi_miso_katsu.png') },
  { prefId: 'mie', foodNameJa: '伊勢うどん', foodNameEn: 'Ise Udon', imageSource: require('@/assets/badges/mie_ise_udon.png') },
  { prefId: 'shiga', foodNameJa: '近江牛', foodNameEn: 'Omi Beef', imageSource: require('@/assets/badges/shiga_omi_beef.png') },
  { prefId: 'kyoto', foodNameJa: '抹茶スイーツ', foodNameEn: 'Matcha Dessert', imageSource: require('@/assets/badges/kyoto_matcha_dessert.png') },
  { prefId: 'osaka', foodNameJa: 'たこ焼き', foodNameEn: 'Takoyaki', imageSource: require('@/assets/badges/osaka_takoyaki.png') },
  { prefId: 'hyogo', foodNameJa: '神戸牛', foodNameEn: 'Kobe Beef', imageSource: require('@/assets/badges/hyogo_kobe_beef.png') },
  { prefId: 'nara', foodNameJa: '柿の葉寿司', foodNameEn: 'Kakinoha Sushi', imageSource: require('@/assets/badges/nara_kakinoha_sushi.png') },
  { prefId: 'wakayama', foodNameJa: '梅干し', foodNameEn: 'Umeboshi', imageSource: require('@/assets/badges/wakayama_umeboshi.png') },
  { prefId: 'tottori', foodNameJa: '二十世紀梨', foodNameEn: 'Japanese Pear', imageSource: require('@/assets/badges/tottori_japanese_pear.png') },
  { prefId: 'shimane', foodNameJa: '出雲そば', foodNameEn: 'Izumo Soba', imageSource: require('@/assets/badges/shimane_izumo_soba.png') },
  { prefId: 'okayama', foodNameJa: '白桃', foodNameEn: 'White Peach', imageSource: require('@/assets/badges/okayama_peach.png') },
  { prefId: 'hiroshima', foodNameJa: 'お好み焼き', foodNameEn: 'Okonomiyaki', imageSource: require('@/assets/badges/hiroshima_okonomiyaki.png') },
  { prefId: 'yamaguchi', foodNameJa: 'ふぐ刺し', foodNameEn: 'Fugu Sashimi', imageSource: require('@/assets/badges/yamaguchi_fugu_sashimi.png') },
  { prefId: 'tokushima', foodNameJa: 'すだち', foodNameEn: 'Sudachi', imageSource: require('@/assets/badges/tokushima_sudachi.png') },
  { prefId: 'kagawa', foodNameJa: '讃岐うどん', foodNameEn: 'Sanuki Udon', imageSource: require('@/assets/badges/kagawa_sanuki_udon.png') },
  { prefId: 'ehime', foodNameJa: 'みかん', foodNameEn: 'Mandarin Orange', imageSource: require('@/assets/badges/ehime_mandarin_orange.png') },
  { prefId: 'kochi', foodNameJa: 'カツオのたたき', foodNameEn: 'Bonito Tataki', imageSource: require('@/assets/badges/kochi_bonito_tataki.png') },
  { prefId: 'fukuoka', foodNameJa: '豚骨ラーメン', foodNameEn: 'Tonkotsu Ramen', imageSource: require('@/assets/badges/fukuoka_tonkotsu_ramen.png') },
  { prefId: 'saga', foodNameJa: '佐賀牛', foodNameEn: 'Saga Beef', imageSource: require('@/assets/badges/saga_saga_beef.png') },
  { prefId: 'nagasaki', foodNameJa: 'カステラ', foodNameEn: 'Castella', imageSource: require('@/assets/badges/nagasaki_castella.png') },
  { prefId: 'kumamoto', foodNameJa: '馬刺し', foodNameEn: 'Horse Sashimi', imageSource: require('@/assets/badges/kumamoto_horse_sashimi.png') },
  { prefId: 'oita', foodNameJa: 'とり天', foodNameEn: 'Toriten', imageSource: require('@/assets/badges/oita_toriten.png') },
  { prefId: 'miyazaki', foodNameJa: 'チキン南蛮', foodNameEn: 'Chicken Nanban', imageSource: require('@/assets/badges/miyazaki_chicken_nanban.png') },
  { prefId: 'kagoshima', foodNameJa: '黒豚', foodNameEn: 'Kurobuta Pork', imageSource: require('@/assets/badges/kagoshima_kurobuta_pork.png') },
  { prefId: 'okinawa', foodNameJa: 'ゴーヤチャンプルー', foodNameEn: 'Goya Champuru', imageSource: require('@/assets/badges/okinawa_goya_champuru.png') },
];

const badgeMap = new Map<string, FoodBadge>();
for (const badge of FOOD_BADGES) {
  badgeMap.set(badge.prefId, badge);
}

export function getFoodBadge(prefId: string): FoodBadge | undefined {
  return badgeMap.get(prefId);
}

export function getAllFoodBadges(): FoodBadge[] {
  return FOOD_BADGES;
}
