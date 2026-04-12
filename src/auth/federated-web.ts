import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';

import { firebaseAuth } from '@/src/firebase/client';

export async function signInWithGoogleWeb() {
  if (process.env.EXPO_OS !== 'web') {
    throw new Error('Google sign-in is only enabled on web in this build.');
  }
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch {
    await signInWithRedirect(firebaseAuth, provider);
  }
}

export async function signInWithAppleWeb() {
  if (process.env.EXPO_OS !== 'web') {
    throw new Error('Apple sign-in is only enabled on web in this build.');
  }
  const provider = new OAuthProvider('apple.com');
  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch {
    await signInWithRedirect(firebaseAuth, provider);
  }
}

