import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { t } from '@/src/i18n';
import { GEOFENCE_TASK_NAME, NOTIFY_COOLDOWN_MS } from '../constants';
import { getMemos, getStore, setStoreLastNotifiedAt } from '../storage';

function isLunchWindow(now: Date) {
  const day = now.getDay(); // 0:Sun .. 6:Sat
  if (day === 0 || day === 6) return false;
  const hour = now.getHours();
  return hour >= 11 && hour < 13;
}

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
    if (!isLunchWindow(new Date(now))) return;
    if (store.lastNotifiedAt && now - store.lastNotifiedAt < NOTIFY_COOLDOWN_MS) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('geofence.nearTitle', { name: store.name }),
        body: t('geofence.nearBody'),
        sound: 'default',
      },
      trigger: null,
    });

    await setStoreLastNotifiedAt(storeId, now);
  } catch {
    // swallow: background task must not throw
  }
});

