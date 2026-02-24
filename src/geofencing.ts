import * as Location from 'expo-location';
import type { Store } from './models';
import { GEOFENCE_RADIUS_METERS, GEOFENCE_TASK_NAME } from './constants';

async function stopGeofencingSafe() {
  try {
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (started) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  } catch (e) {
    console.warn('stopGeofencingSafe failed:', e);
  }
}

export async function syncGeofencing(stores: Store[]) {
  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) {
    await stopGeofencingSafe();
    return;
  }

  const enabledStores = stores.filter((s) => s.enabled);

  if (enabledStores.length === 0) {
    await stopGeofencingSafe();
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

  try {
    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
  } catch (e) {
    console.warn('startGeofencingAsync failed (background location may not be configured):', e);
  }
}

