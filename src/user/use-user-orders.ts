import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React from 'react';

import { firestore } from '@/src/firebase/client';

export type UserOrderDoc = {
  id: string;
  status: string;
  driverId?: string;
  adminId: string;
  pickupLocation?: any;
  dropoffLocation?: any;
  price?: number;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
  updatedAt?: any;
  createdAt?: any;
};

export function useUserOrders(params: { uid: string | null | undefined }) {
  const uid = params.uid ?? null;
  const [orders, setOrders] = React.useState<UserOrderDoc[]>([]);

  React.useEffect(() => {
    if (!uid) return;
    const q = query(collection(firestore, 'orders'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as UserOrderDoc[]);
    });
  }, [uid]);

  return { orders };
}
