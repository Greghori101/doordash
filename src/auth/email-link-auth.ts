import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import {
  ActionCodeSettings,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { firebaseAuth } from '@/src/firebase/client';

const PENDING_EMAIL_KEY = '@doordrop/pending_sign_in_email';

function getActionCodeSettings(): ActionCodeSettings {
  // In production builds, use the registered app scheme.
  // In Expo Go dev, Linking.createURL produces an exp:// URL — Firebase won't
  // accept that as a continueUrl, so we fall back to the Firebase Hosting URL
  // and rely on the deep-link handler to catch it when the link opens the app.
  const continueUrl =
    Platform.OS === 'web'
      ? `${window?.location?.origin ?? 'https://doordash-9af85.firebaseapp.com'}/sign-in`
      : 'https://doordash-9af85.firebaseapp.com';

  return {
    url: continueUrl,
    handleCodeInApp: true,
    android: {
      packageName: 'com.hoceyne.doordrop',
      installApp: false,
    },
    iOS: {
      bundleId: 'com.hoceyne.doordrop',
    },
  };
}

export async function sendEmailSignInLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(firebaseAuth, email, getActionCodeSettings());
  await AsyncStorage.setItem(PENDING_EMAIL_KEY, email);
}

export async function completeEmailSignIn(url: string): Promise<boolean> {
  if (!isSignInWithEmailLink(firebaseAuth, url)) return false;

  const email = await AsyncStorage.getItem(PENDING_EMAIL_KEY);
  if (!email) return false;

  await signInWithEmailLink(firebaseAuth, email, url);
  await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
  return true;
}

export async function getPendingSignInEmail(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_EMAIL_KEY);
}

export function isEmailSignInLink(url: string): boolean {
  return isSignInWithEmailLink(firebaseAuth, url);
}
