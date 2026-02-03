export type Store = {
  id: string;
  name: string;
  placeId?: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
  backgroundImageUri?: string;
  note?: string;
  timeBand?: '10' | '20' | '30';
  parking?: number;
  smoking?: number;
  seating?: 'counter' | 'table';
  isFavorite?: boolean;
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

