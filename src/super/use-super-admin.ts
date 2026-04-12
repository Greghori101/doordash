import React from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { firestore } from '@/src/firebase/client';

export type AdminUserDoc = {
  id: string;
  email?: string;
  role?: string;
  adminId?: string;
  status?: 'active' | 'suspended';
  createdAt?: any;
};

export type SuperAuditDoc = {
  id: string;
  actorId: string;
  type: string;
  details?: Record<string, any>;
  createdAt?: any;
};

export function useSuperAdminData() {
  const [admins, setAdmins] = React.useState<AdminUserDoc[]>([]);
  const [audit, setAudit] = React.useState<SuperAuditDoc[]>([]);

  React.useEffect(() => {
    const q = query(collection(firestore, 'users'), where('role', '==', 'admin'));
    return onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AdminUserDoc[]);
    });
  }, []);

  React.useEffect(() => {
    const q = query(collection(firestore, 'super_audit_logs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setAudit(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SuperAuditDoc[]);
    });
  }, []);

  return { admins, audit };
}

