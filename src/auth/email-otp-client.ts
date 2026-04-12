import { httpsCallable } from 'firebase/functions';

import { functionsClient } from '@/src/firebase/client';

export async function requestEmailOtp(params: { email: string }) {
  const fn = httpsCallable(functionsClient, 'requestEmailOtp');
  const res = await fn({ email: params.email });
  return res.data as { ok: boolean; expiresAtMs: number };
}

export async function verifyEmailOtp(params: { email: string; code: string }) {
  const fn = httpsCallable(functionsClient, 'verifyEmailOtp');
  const res = await fn({ email: params.email, code: params.code });
  return res.data as { customToken: string };
}

