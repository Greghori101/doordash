import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React from 'react';

import { firestore } from '@/src/firebase/client';

export type Product = {
  id: string;
  adminId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  available: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export function useAdminProducts({ adminId }: { adminId: string | null }) {
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    if (!adminId) {
      setProducts([]);
      return;
    }
    const q = query(
      collection(firestore, 'products'),
      where('adminId', '==', adminId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) })));
    });
  }, [adminId]);

  return { products };
}
