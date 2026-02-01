import * as Location from 'expo-location';
import type { Store } from './models';
import { GEOFENCE_RADIUS_METERS, GEOFENCE_TASK_NAME } from './constants';

export async function syncGeofencing(stores: Store[]) {
  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) {
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (started) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    return;
  }

  const enabledStores = stores.filter((s) => s.enabled);

  if (enabledStores.length === 0) {
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (started) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    return;
  }

  const regions: Location.LocationRegion[] = enabledStores.map((s) => ({
    identifier: s.id,
    latitude: s.latitude,
    longitude: s.longitude,
    radius: GEOFENCE_RADIUS_METERS,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
}

