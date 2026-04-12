import React from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { firestore } from '@/src/firebase/client';

export type DriverUserDoc = {
  id: string;
  email?: string;
  adminId?: string;
  role?: string;
  status?: 'active' | 'suspended';
};

export function useAdminDriverUsers(params: { adminId: string | null | undefined }) {
  const adminId = params.adminId ?? null;
  const [driverUsers, setDriverUsers] = React.useState<DriverUserDoc[]>([]);

  React.useEffect(() => {
    if (!adminId) return;
    const q = query(collection(firestore, 'users'), where('role', '==', 'driver'), where('adminId', '==', adminId));
    return onSnapshot(q, (snap) => {
      setDriverUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as DriverUserDoc[]);
    });
  }, [adminId]);

  return { driverUsers };
}

