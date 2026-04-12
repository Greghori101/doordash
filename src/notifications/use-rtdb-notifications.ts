import React from 'react';
import { limitToLast, onValue, orderByChild, query, ref } from 'firebase/database';

import { rtdb } from '@/src/firebase/client';

export type RtdbNotification = {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
  createdAtMs?: number;
};

export function useRtdbNotifications(params: { uid: string | null | undefined; limit?: number }) {
  const uid = params.uid ?? null;
  const max = params.limit ?? 20;
  const [items, setItems] = React.useState<RtdbNotification[]>([]);

  React.useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }

    const q = query(ref(rtdb, `notifications/${uid}`), orderByChild('createdAtMs'), limitToLast(max));
    return onValue(q, (snap) => {
      const v = snap.val() as Record<string, any> | null;
      if (!v) {
        setItems([]);
        return;
      }
      const next = Object.entries(v).map(([id, data]) => ({ id, ...(data as any) })) as RtdbNotification[];
      next.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      setItems(next);
    });
  }, [uid, max]);

  return { items };
}
