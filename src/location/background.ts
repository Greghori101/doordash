import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GeoPoint, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { firestore } from '@/src/firebase/client';
import { writeDriverLocationToRTDB } from '@/src/location/rtdb-location';

export const DRIVER_LOCATION_TASK = 'driver-location-task';
const DRIVER_ID_KEY = 'doordrop:driverId';

if (process.env.EXPO_OS !== 'web') {
  TaskManager.defineTask(DRIVER_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) return;
    const locations = data?.locations as Location.LocationObject[] | undefined;
    if (!locations || locations.length === 0) return;

    const last = locations[locations.length - 1];

    const driverId = await AsyncStorage.getItem(DRIVER_ID_KEY);
    if (!driverId) return;

    const lat = last.coords.latitude;
    const lng = last.coords.longitude;

    try {
      await updateDoc(doc(firestore, 'drivers', driverId), {
        currentLocation: new GeoPoint(lat, lng),
        updatedAt: serverTimestamp(),
      });
      await writeDriverLocationToRTDB({
        driverId,
        lat,
        lng,
        heading: typeof last.coords.heading === 'number' ? last.coords.heading : null,
        speed: typeof last.coords.speed === 'number' ? last.coords.speed : null,
      });
    } catch {}
  });
}

export async function startDriverBackgroundLocation(params: { driverId: string }) {
  if (process.env.EXPO_OS === 'web') return;

  await AsyncStorage.setItem(DRIVER_ID_KEY, params.driverId);

  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) {
    throw new Error('Foreground location permission not granted');
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) {
    throw new Error('Background location permission not granted');
  }

  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (started) return;

  await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: 'DoorDrop',
      notificationBody: 'Sharing your location for active deliveries.',
    },
  });
}

export async function stopDriverBackgroundLocation() {
  if (process.env.EXPO_OS === 'web') return;
  await AsyncStorage.removeItem(DRIVER_ID_KEY);
  const started = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}
