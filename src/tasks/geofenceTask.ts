import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { NOTIFY_COOLDOWN_MS, GEOFENCE_TASK_NAME } from '../constants';
import { getMemos, getStore, setStoreLastNotifiedAt } from '../storage';

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  try {
    if (error) return;
    const eventType = (data as any)?.eventType as number | undefined;
    const region = (data as any)?.region as Location.LocationRegion | undefined;
    if (!region?.identifier) return;

    if (eventType !== Location.GeofencingEventType.Enter) return;

    const storeId = region.identifier;
    const store = await getStore(storeId);
    if (!store) return;
    if (!store.enabled) return;

    const memos = await getMemos(storeId);
    if (!memos || memos.length === 0) return;

    const now = Date.now();
    if (store.lastNotifiedAt && now - store.lastNotifiedAt < NOTIFY_COOLDOWN_MS) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${store.name}の近くです`,
        body: '買い物メモがあります',
        sound: 'default',
      },
      trigger: null,
    });

    await setStoreLastNotifiedAt(storeId, now);
  } catch {
    // swallow: background task must not throw
  }
});

