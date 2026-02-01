export type Store = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
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

