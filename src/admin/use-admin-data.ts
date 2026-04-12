import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React from 'react';

import { firestore } from '@/src/firebase/client';

export type DriverDoc = {
  id: string;
  adminId: string;
  isOnline: boolean;
  status: 'idle' | 'busy';
  currentLocation?: { latitude: number; longitude: number } | any;
};

export type OrderDoc = {
  id: string;
  adminId: string;
  userId: string;
  driverId?: string;
  status: 'pending' | 'assigned' | 'accepted' | 'picked' | 'delivered' | 'cancelled';
  price?: number;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
  pickupLocation?: any;
  dropoffLocation?: any;
};

export function useAdminData(params: { adminId: string | null | undefined }) {
  const adminId = params.adminId ?? null;
  const [drivers, setDrivers] = React.useState<DriverDoc[]>([]);
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);

  React.useEffect(() => {
    if (!adminId) return;
    const q = query(collection(firestore, 'drivers'), where('adminId', '==', adminId));
    return onSnapshot(q, (snap) => {
      setDrivers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as DriverDoc[]);
    });
  }, [adminId]);

  React.useEffect(() => {
    if (!adminId) return;
    const q = query(collection(firestore, 'orders'), where('adminId', '==', adminId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[]);
    });
  }, [adminId]);

  return { drivers, orders };
}
