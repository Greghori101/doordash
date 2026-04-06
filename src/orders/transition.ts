import { httpsCallable } from 'firebase/functions';

import { functionsClient } from '@/src/firebase/client';

export type OrderAction =
  | 'admin_assign'
  | 'admin_reassign'
  | 'driver_accept'
  | 'driver_reject'
  | 'driver_picked'
  | 'driver_delivered'
  | 'user_cancel';

export async function transitionOrder(params: { action: OrderAction; orderId: string; driverId?: string | null }) {
  const fn = httpsCallable(functionsClient, 'transitionOrder');
  await fn({ action: params.action, orderId: params.orderId, driverId: params.driverId ?? null });
}

