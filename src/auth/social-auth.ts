import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { Platform } from 'react-native';

import { firebaseAuth } from '@/src/firebase/client';

// ─── Apple ────────────────────────────────────────────────────────────────────

export async function signInWithApple(): Promise<void> {
  if (Platform.OS === 'ios') {
    // Dynamic import so Android bundler never hits expo-apple-authentication
    const AppleAuth = await import('expo-apple-authentication');
    const cred = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!cred.identityToken) throw new Error('Apple sign-in did not return an identity token.');
    const provider = new OAuthProvider('apple.com');
    const oauthCred = provider.credential({ idToken: cred.identityToken });
    await signInWithCredential(firebaseAuth, oauthCred);
    return;
  }

  // Web fallback
  const provider = new OAuthProvider('apple.com');
  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch {
    await signInWithRedirect(firebaseAuth, provider);
  }
}

// ─── Google (web only — native uses useGoogleAuth hook) ───────────────────────

export async function signInWithGoogleWeb(): Promise<void> {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(firebaseAuth, provider);
  } catch {
    await signInWithRedirect(firebaseAuth, provider);
  }
}

export async function signInWithGoogleCredential(idToken: string): Promise<void> {
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(firebaseAuth, credential);
}
