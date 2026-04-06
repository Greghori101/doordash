import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '@/src/firebase/client';
import type { AppRole, UserProfile } from '@/src/auth/types';

export async function setCurrentUserRole(params: { role: AppRole; adminId?: string }) {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Not signed in');
  }

  const baseProfile: Partial<UserProfile> = {
    id: user.uid,
    name: user.displayName ?? undefined,
    email: user.email ?? undefined,
    role: params.role,
    adminId: params.adminId,
  };

  if (params.role === 'admin') {
    const adminId = user.uid;
    await setDoc(
      doc(firestore, 'admins', adminId),
      { id: adminId, name: user.displayName ?? 'Admin', companyName: 'DoorDrop', createdAt: serverTimestamp() },
      { merge: true }
    );
    await setDoc(doc(firestore, 'users', user.uid), { ...baseProfile, adminId, createdAt: serverTimestamp() }, { merge: true });
    return;
  }

  if (params.role === 'driver') {
    const adminId = params.adminId?.trim();
    if (!adminId) {
      throw new Error('Driver must have an adminId');
    }
    await setDoc(
      doc(firestore, 'drivers', user.uid),
      { id: user.uid, userId: user.uid, adminId, isOnline: false, status: 'idle', updatedAt: serverTimestamp() },
      { merge: true }
    );
    await setDoc(doc(firestore, 'users', user.uid), { ...baseProfile, adminId, createdAt: serverTimestamp() }, { merge: true });
    return;
  }

  await setDoc(doc(firestore, 'users', user.uid), { ...baseProfile, createdAt: serverTimestamp() }, { merge: true });
}

