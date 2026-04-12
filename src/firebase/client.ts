import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env (see .env.example).`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requiredEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: requiredEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  databaseURL: requiredEnv('EXPO_PUBLIC_FIREBASE_DATABASE_URL'),
  projectId: requiredEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: requiredEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requiredEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requiredEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  try {
    const authModule: any = require('firebase/auth');
    const getReactNativePersistence =
      authModule?.getReactNativePersistence ?? authModule?.default?.getReactNativePersistence ?? null;
    if (!getReactNativePersistence) {
      return getAuth(firebaseApp);
    }
    return initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e: any) {
    const code = String(e?.code ?? '');
    const message = String(e?.message ?? '');
    if (code === 'auth/already-initialized' || message.includes('already-initialized')) {
      return getAuth(firebaseApp);
    }
    return getAuth(firebaseApp);
  }
})();
export const firestore = getFirestore(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
const functionsRegion = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const functionsClient = getFunctions(firebaseApp, functionsRegion);
