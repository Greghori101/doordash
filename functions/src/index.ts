import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';

admin.initializeApp();

type LatLng = { lat: number; lng: number };
type Candidate = {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
  location: LatLng | null;
};

function toLatLng(value: any): LatLng | null {
  if (!value) return null;
  const lat = typeof value.latitude === 'number' ? value.latitude : typeof value._lat === 'number' ? value._lat : null;
  const lng =
    typeof value.longitude === 'number' ? value.longitude : typeof value._long === 'number' ? value._long : null;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function haversineMeters(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

async function getUserPushTokens(uid: string): Promise<string[]> {
  const snap = await admin.firestore().collection('users').doc(uid).get();
  const tokens = (snap.data() as any)?.pushTokens;
  return Array.isArray(tokens) ? tokens.filter((t) => typeof t === 'string') : [];
}

async function sendExpoPush(tokens: string[], message: { title: string; body: string; data?: Record<string, any> }) {
  const unique = Array.from(new Set(tokens)).filter((t) => t.startsWith('ExponentPushToken['));
  if (unique.length === 0) return;

  const payload = unique.map((to) => ({
    to,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

type Role = 'user' | 'driver' | 'admin';
type OrderStatus = 'pending' | 'assigned' | 'picked' | 'delivered' | 'cancelled';
type OrderAction =
  | 'admin_assign'
  | 'admin_reassign'
  | 'driver_accept'
  | 'driver_reject'
  | 'driver_picked'
  | 'driver_delivered'
  | 'user_cancel';

async function getUserRoleAndAdminId(uid: string): Promise<{ role: Role | null; adminId: string | null }> {
  const snap = await admin.firestore().collection('users').doc(uid).get();
  const data = snap.data() as any;
  return { role: (data?.role as Role | undefined) ?? null, adminId: (data?.adminId as string | undefined) ?? null };
}

export const transitionOrder = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const action = data?.action as OrderAction | undefined;
  const orderId = data?.orderId as string | undefined;
  const driverId = (data?.driverId as string | null | undefined) ?? null;

  if (!action || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing action or orderId.');
  }

  const { role, adminId } = await getUserRoleAndAdminId(uid);
  if (!role) {
    throw new functions.https.HttpsError('failed-precondition', 'Missing user role.');
  }

  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found.');
    }
    const order = orderSnap.data() as any;

    const status = order?.status as OrderStatus | undefined;
    const currentDriverId = (order?.driverId as string | undefined) ?? null;
    const orderAdminId = (order?.adminId as string | undefined) ?? null;
    const orderUserId = (order?.userId as string | undefined) ?? null;

    const eventRef = db.collection('order_events').doc();

    if (action === 'admin_assign' || action === 'admin_reassign') {
      if (role !== 'admin') throw new functions.https.HttpsError('permission-denied', 'Admin only.');
      if (!adminId || adminId !== orderAdminId) throw new functions.https.HttpsError('permission-denied', 'Wrong tenant.');
      if (!driverId) throw new functions.https.HttpsError('invalid-argument', 'Missing driverId.');
      if (status !== 'pending' && action === 'admin_assign') {
        throw new functions.https.HttpsError('failed-precondition', 'Can only assign a pending order.');
      }
      if (status !== 'pending' && status !== 'assigned') {
        throw new functions.https.HttpsError('failed-precondition', 'Can only reassign pending/assigned orders.');
      }

      if (currentDriverId && currentDriverId !== driverId) {
        tx.update(db.collection('drivers').doc(currentDriverId), { status: 'idle', updatedAt: now });
      }

      const nextDriverRef = db.collection('drivers').doc(driverId);
      const nextDriverSnap = await tx.get(nextDriverRef);
      if (!nextDriverSnap.exists) throw new functions.https.HttpsError('not-found', 'Driver not found.');
      const nextDriver = nextDriverSnap.data() as any;
      if (nextDriver.adminId !== adminId) throw new functions.https.HttpsError('permission-denied', 'Driver not in tenant.');
      if (nextDriver.isOnline !== true) throw new functions.https.HttpsError('failed-precondition', 'Driver is offline.');
      if (nextDriver.status !== 'idle') throw new functions.https.HttpsError('failed-precondition', 'Driver not idle.');

      tx.update(nextDriverRef, { status: 'busy', updatedAt: now });
      tx.update(orderRef, {
        driverId,
        status: 'assigned',
        driverAcceptedAt: admin.firestore.FieldValue.delete(),
        pickedAt: admin.firestore.FieldValue.delete(),
        deliveredAt: admin.firestore.FieldValue.delete(),
        updatedAt: now,
        updatedBy: uid,
      });
      tx.set(eventRef, { orderId, status: action === 'admin_assign' ? 'assigned' : 'driver_changed', actorId: uid, timestamp: now, driverId });
      return;
    }

    if (action === 'driver_accept') {
      if (role !== 'driver') throw new functions.https.HttpsError('permission-denied', 'Driver only.');
      if (currentDriverId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not assigned to you.');
      if (status !== 'assigned') throw new functions.https.HttpsError('failed-precondition', 'Order not assignable.');
      if (order?.driverAcceptedAt) return;
      tx.update(orderRef, { driverAcceptedAt: now, updatedAt: now, updatedBy: uid });
      tx.set(eventRef, { orderId, status: 'driver_accepted', actorId: uid, timestamp: now });
      return;
    }

    if (action === 'driver_reject') {
      if (role !== 'driver') throw new functions.https.HttpsError('permission-denied', 'Driver only.');
      if (currentDriverId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not assigned to you.');
      if (status !== 'assigned') throw new functions.https.HttpsError('failed-precondition', 'Only assigned orders can be rejected.');
      tx.update(db.collection('drivers').doc(uid), { status: 'idle', updatedAt: now });
      tx.update(orderRef, {
        driverId: admin.firestore.FieldValue.delete(),
        status: 'pending',
        driverAcceptedAt: admin.firestore.FieldValue.delete(),
        updatedAt: now,
        updatedBy: uid,
      });
      tx.set(eventRef, { orderId, status: 'driver_rejected', actorId: uid, timestamp: now });
      return;
    }

    if (action === 'driver_picked') {
      if (role !== 'driver') throw new functions.https.HttpsError('permission-denied', 'Driver only.');
      if (currentDriverId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not assigned to you.');
      if (status !== 'assigned') throw new functions.https.HttpsError('failed-precondition', 'Order must be assigned.');
      if (!order?.driverAcceptedAt) throw new functions.https.HttpsError('failed-precondition', 'Order must be accepted first.');
      tx.update(db.collection('drivers').doc(uid), { status: 'busy', updatedAt: now });
      tx.update(orderRef, { status: 'picked', pickedAt: now, updatedAt: now, updatedBy: uid });
      tx.set(eventRef, { orderId, status: 'picked', actorId: uid, timestamp: now });
      return;
    }

    if (action === 'driver_delivered') {
      if (role !== 'driver') throw new functions.https.HttpsError('permission-denied', 'Driver only.');
      if (currentDriverId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not assigned to you.');
      if (status !== 'picked') throw new functions.https.HttpsError('failed-precondition', 'Order must be picked.');
      tx.update(db.collection('drivers').doc(uid), { status: 'idle', updatedAt: now });
      tx.update(orderRef, { status: 'delivered', deliveredAt: now, updatedAt: now, updatedBy: uid });
      tx.set(eventRef, { orderId, status: 'delivered', actorId: uid, timestamp: now });
      return;
    }

    if (action === 'user_cancel') {
      if (role !== 'user') throw new functions.https.HttpsError('permission-denied', 'User only.');
      if (orderUserId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your order.');
      if (status !== 'pending' && status !== 'assigned') {
        throw new functions.https.HttpsError('failed-precondition', 'Only pending/assigned orders can be cancelled.');
      }
      if (currentDriverId) {
        tx.update(db.collection('drivers').doc(currentDriverId), { status: 'idle', updatedAt: now });
      }
      tx.update(orderRef, { status: 'cancelled', updatedAt: now, updatedBy: uid });
      tx.set(eventRef, { orderId, status: 'cancelled', actorId: uid, timestamp: now });
      return;
    }
  });
});

export const onOrderCreated = functions.firestore.document('orders/{orderId}').onCreate(async (snap, ctx) => {
  const orderId = ctx.params.orderId as string;
  const order = snap.data() as any;

  const adminId: string | undefined = order?.adminId;
  const status: string | undefined = order?.status;
  const pickup = toLatLng(order?.pickupLocation);

  if (!adminId) return;
  if (status && status !== 'pending') return;
  if (order?.driverId) return;

  const driversQuery = await admin
    .firestore()
    .collection('drivers')
    .where('adminId', '==', adminId)
    .where('isOnline', '==', true)
    .where('status', '==', 'idle')
    .limit(25)
    .get();

  if (driversQuery.empty) return;

  const candidates: Candidate[] = driversQuery.docs
    .map((d): Candidate => ({ id: d.id, ref: d.ref, data: d.data(), location: toLatLng(d.data().currentLocation) }))
    .sort((a: Candidate, b: Candidate) => {
      if (!pickup) return 0;
      if (!a.location && !b.location) return 0;
      if (!a.location) return 1;
      if (!b.location) return -1;
      return haversineMeters(pickup, a.location) - haversineMeters(pickup, b.location);
    });

  const chosen = candidates[0];
  if (!chosen) return;

  const orderRef = admin.firestore().collection('orders').doc(orderId);
  const eventsRef = admin.firestore().collection('order_events').doc();

  await admin.firestore().runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) return;
    const current = orderSnap.data() as any;
    if (current.driverId) return;
    if (current.status && current.status !== 'pending') return;

    const driverSnap = await tx.get(chosen.ref);
    if (!driverSnap.exists) return;
    const driver = driverSnap.data() as any;
    if (driver.adminId !== adminId) return;
    if (driver.isOnline !== true) return;
    if (driver.status !== 'idle') return;

    tx.update(chosen.ref, { status: 'busy', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(orderRef, {
      driverId: chosen.id,
      status: 'assigned',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(eventsRef, {
      orderId,
      status: 'assigned',
      actorId: 'system',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const assignedOrderSnap = await admin.firestore().collection('orders').doc(orderId).get();
  const assigned = assignedOrderSnap.data() as any;
  const driverId = assigned?.driverId as string | undefined;
  if (driverId && driverId === chosen.id) {
    const tokens = await getUserPushTokens(driverId);
    await sendExpoPush(tokens, {
      title: 'New delivery assigned',
      body: `Order ${orderId} is assigned to you.`,
      data: { type: 'order_assigned', orderId },
    });
  }
});

export const onOrderUpdated = functions.firestore.document('orders/{orderId}').onUpdate(async (change, ctx) => {
  const orderId = ctx.params.orderId as string;
  const before = change.before.data() as any;
  const after = change.after.data() as any;

  const beforeStatus = before?.status as string | undefined;
  const afterStatus = after?.status as string | undefined;
  const beforeDriverId = before?.driverId as string | undefined;
  const afterDriverId = after?.driverId as string | undefined;

  const actorId = (after?.updatedBy as string | undefined) ?? 'system';

  const db = admin.firestore();
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let didWork = false;

  if (beforeDriverId !== afterDriverId) {
    if (beforeDriverId) {
      batch.update(db.collection('drivers').doc(beforeDriverId), { status: 'idle', updatedAt: now });
      didWork = true;
    }
    if (afterDriverId) {
      batch.update(db.collection('drivers').doc(afterDriverId), { status: 'busy', updatedAt: now });
      didWork = true;
    }
  }

  if (beforeStatus !== afterStatus && afterStatus) {
    if (afterDriverId) {
      if (afterStatus === 'picked') {
        batch.update(db.collection('drivers').doc(afterDriverId), { status: 'busy', updatedAt: now });
        didWork = true;
      }
      if (afterStatus === 'delivered' || afterStatus === 'cancelled') {
        batch.update(db.collection('drivers').doc(afterDriverId), { status: 'idle', updatedAt: now });
        didWork = true;
      }
    }
  }

  if (!didWork) return;
  await batch.commit();

  const userId = (after?.userId as string | undefined) ?? null;
  const adminId = (after?.adminId as string | undefined) ?? null;

  const notifyUserIds = [userId, adminId, afterDriverId].filter((v): v is string => typeof v === 'string' && v.length > 0);

  if (beforeDriverId !== afterDriverId && afterDriverId) {
    const tokens = await getUserPushTokens(afterDriverId);
    await sendExpoPush(tokens, { title: 'Delivery assigned', body: `Order ${orderId} assigned to you.`, data: { type: 'order_assigned', orderId } });
  }

  if (beforeStatus !== afterStatus && afterStatus) {
    await Promise.all(
      notifyUserIds.map(async (uid) => {
        const tokens = await getUserPushTokens(uid);
        await sendExpoPush(tokens, {
          title: 'Order update',
          body: `Order ${orderId} is now ${afterStatus}.`,
          data: { type: 'order_status', orderId, status: afterStatus },
        });
      })
    );
  }
});
