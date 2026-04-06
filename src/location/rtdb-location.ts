import { ref, set } from 'firebase/database';

import { rtdb } from '@/src/firebase/client';

export async function writeDriverLocationToRTDB(params: {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
}) {
  const locationRef = ref(rtdb, `locations/${params.driverId}`);
  await set(locationRef, {
    lat: params.lat,
    lng: params.lng,
    heading: params.heading ?? null,
    speed: params.speed ?? null,
    updatedAt: Date.now(),
  });
}

