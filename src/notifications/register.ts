import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { arrayUnion, doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { firestore } from '@/src/firebase/client';

export async function registerForPushNotificationsAsync(params: { uid: string }) {
  if (process.env.EXPO_OS === 'web') return;
  if (!Device.isDevice) return;

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing.status === 'granted' ? existing.status : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') return;

  const expoPushToken = (await Notifications.getExpoPushTokenAsync()).data;

  await setDoc(
    doc(firestore, 'users', params.uid),
    {
      pushTokens: arrayUnion(expoPushToken),
      pushTokensUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

