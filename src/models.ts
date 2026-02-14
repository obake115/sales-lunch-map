export type Store = {
  id: string;
  name: string;
  placeId?: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
  backgroundImageUri?: string;
  photoUri?: string;
  note?: string;
  timeBand?: '10' | '20' | '30' | '30+';
  moodTags?: string[];
  sceneTags?: string[];
  parking?: number;
  smoking?: number;
  seating?: 'counter' | 'table' | 'horigotatsu';
  isFavorite?: boolean;
  shareToEveryone?: boolean;
  remindEnabled?: boolean;
  remindRadiusM?: number;
  createdAt: number;
  updatedAt: number;
  lastNotifiedAt?: number;
};

export type Memo = {
  id: string;
  storeId: string;
  text: string;
  checked: boolean;
  reminderAt?: number; // unix ms
  reminderNotificationId?: string; // expo-notifications scheduled id
  createdAt: number;
};

export type AlbumPhoto = {
  id: string;
  uri: string;
  createdAt: number;
  takenAt: number;
  storeId?: string;
};

export type PrefecturePhoto = {
  prefectureId: string;
  photoUri: string;
  updatedAt: number;
};

export type TravelLunchEntry = {
  id: string;
  prefectureId: string;
  imageUri: string;
  restaurantName: string;
  genre: string;
  visitedAt: string; // YYYY-MM-DD
  rating: number; // 1-5
  memo?: string;
  createdAt: number;
};
