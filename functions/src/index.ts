import * as crypto from 'crypto';
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

type Role = 'user' | 'driver' | 'admin' | 'super_admin';
type OrderStatus = 'pending' | 'assigned' | 'accepted' | 'picked' | 'delivered' | 'cancelled';
type OrderAction =
  | 'admin_assign'
  | 'admin_reassign'
  | 'driver_accept'
  | 'driver_reject'
  | 'driver_picked'
  | 'driver_delivered'
  | 'driver_collect_cash'
  | 'user_cancel';

async function getUserRoleAndAdminId(uid: string): Promise<{ role: Role | null; adminId: string | null; status: string | null }> {
  const snap = await admin.firestore().collection('users').doc(uid).get();
  const data = snap.data() as any;
  return {
    role: (data?.role as Role | undefined) ?? null,
    adminId: (data?.adminId as string | undefined) ?? null,
    status: (data?.status as string | undefined) ?? null,
  };
}

async function requireSuperAdmin(uid: string) {
  const snap = await admin.firestore().collection('users').doc(uid).get();
  const role = (snap.data() as any)?.role as string | undefined;
  if (role !== 'super_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Super admin only.');
  }
}

async function writeSuperAudit(params: { actorId: string; type: string; details: Record<string, any> }) {
  await admin.firestore().collection('super_audit_logs').add({
    actorId: params.actorId,
    type: params.type,
    details: params.details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function notifyUserViaRTDB(params: { uid: string; type: string; title: string; body: string; data?: Record<string, any> }) {
  try {
    const ref = admin.database().ref(`notifications/${params.uid}`).push();
    await ref.set({
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? {},
      createdAtMs: Date.now(),
    });
  } catch (e: any) {
    console.error('RTDB notify failed:', e?.message ?? e);
  }
}

function normalizeEmail(email: string) {
  return String(email ?? '').trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function otpDocId(email: string) {
  return Buffer.from(email, 'utf8').toString('base64url');
}

function randomOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(params: { email: string; code: string; expiresAtMs: number }) {
  const cfg = functions.config() as any;
  const apiKey = String(cfg?.sendgrid?.api_key ?? '');
  const from = String(cfg?.sendgrid?.from ?? '');
  if (!apiKey || !from) return;

  const minutes = Math.max(1, Math.floor((params.expiresAtMs - Date.now()) / 60000));

  const payload = {
    personalizations: [{ to: [{ email: params.email }] }],
    from: { email: from, name: 'DoorDrop' },
    subject: 'Your DoorDrop verification code',
    content: [
      {
        type: 'text/plain',
        value: `Your DoorDrop verification code is ${params.code}. It expires in ${minutes} minutes.`,
      },
    ],
  };

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export const requestEmailOtp = functions.https.onCall(async (data) => {
  const email = normalizeEmail(data?.email);
  if (!email || !isValidEmail(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email.');
  }

  const db = admin.firestore();
  const docRef = db.collection('email_otps').doc(otpDocId(email));
  const nowMs = Date.now();
  const ttlMs = 5 * 60 * 1000;

  const snap = await docRef.get();
  const existing = snap.exists ? (snap.data() as any) : null;
  const existingExpiresAtMs = typeof existing?.expiresAtMs === 'number' ? existing.expiresAtMs : null;
  const existingRequestedAtMs = typeof existing?.requestedAtMs === 'number' ? existing.requestedAtMs : null;

  if (existingExpiresAtMs && existingExpiresAtMs > nowMs && existingRequestedAtMs && nowMs - existingRequestedAtMs < 30_000) {
    throw new functions.https.HttpsError('resource-exhausted', 'Please wait before requesting another code.');
  }

  const code = randomOtpCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.createHash('sha256').update(`${email}:${code}:${salt}`).digest('hex');

  const expiresAtMs = nowMs + ttlMs;

  await docRef.set({
    email,
    salt,
    digest,
    expiresAtMs,
    requestedAtMs: nowMs,
    attempts: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await sendOtpEmail({ email, code, expiresAtMs });
  } catch (e: any) {
    console.error('Failed to send OTP email:', e?.message ?? e);
  }

  const cfg = functions.config() as any;
  const debugOtp = String(cfg?.otp?.debug ?? '') === 'true';
  if (debugOtp) {
    console.log('Email OTP requested:', { email, code, expiresAtMs });
  } else {
    console.log('Email OTP requested:', { email, expiresAtMs });
  }

  return { ok: true, expiresAtMs };
});

export const verifyEmailOtp = functions.https.onCall(async (data) => {
  const email = normalizeEmail(data?.email);
  const code = String(data?.code ?? '').trim();
  if (!email || !isValidEmail(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email.');
  }
  if (!/^\d{6}$/.test(code)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid code.');
  }

  const db = admin.firestore();
  const docRef = db.collection('email_otps').doc(otpDocId(email));
  const nowMs = Date.now();

  const snap = await docRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Code expired. Request a new code.');
  }

  const record = snap.data() as any;
  const expiresAtMs = typeof record?.expiresAtMs === 'number' ? record.expiresAtMs : 0;
  const salt = String(record?.salt ?? '');
  const digest = String(record?.digest ?? '');
  const attempts = typeof record?.attempts === 'number' ? record.attempts : 0;

  if (attempts >= 8) {
    await docRef.delete();
    throw new functions.https.HttpsError('resource-exhausted', 'Too many attempts. Request a new code.');
  }

  if (expiresAtMs <= nowMs) {
    await docRef.delete();
    throw new functions.https.HttpsError('failed-precondition', 'Code expired. Request a new code.');
  }

  const candidate = crypto.createHash('sha256').update(`${email}:${code}:${salt}`).digest('hex');
  if (candidate !== digest) {
    await docRef.set({ attempts: attempts + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    throw new functions.https.HttpsError('failed-precondition', 'Incorrect code.');
  }

  await docRef.delete();

  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code === 'auth/user-not-found') {
      user = await admin.auth().createUser({ email });
    } else {
      throw new functions.https.HttpsError('internal', 'Auth lookup failed.');
    }
  }

  const token = await admin.auth().createCustomToken(user.uid);
  return { customToken: token };
});

export const superAdminSetUserStatus = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  await requireSuperAdmin(uid);

  const targetUid = String(data?.uid ?? '');
  const status = String(data?.status ?? '');
  if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'Missing uid.');
  if (status !== 'active' && status !== 'suspended') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid status.');
  }

  await admin.firestore().collection('users').doc(targetUid).set(
    {
      status,
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await writeSuperAudit({ actorId: uid, type: 'USER_STATUS_CHANGED', details: { uid: targetUid, status } });
  return { ok: true };
});

export const superAdminCreateAdmin = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  await requireSuperAdmin(uid);

  const email = normalizeEmail(data?.email);
  if (!email || !isValidEmail(email)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid email.');
  }

  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code === 'auth/user-not-found') {
      user = await admin.auth().createUser({ email });
    } else {
      throw new functions.https.HttpsError('internal', 'Auth create failed.');
    }
  }

  await admin.firestore().collection('users').doc(user.uid).set(
    {
      id: user.uid,
      email,
      role: 'admin',
      adminId: user.uid,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await admin.firestore().collection('admins').doc(user.uid).set(
    { id: user.uid, name: 'Admin', companyName: 'DoorDrop', createdAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  await writeSuperAudit({ actorId: uid, type: 'ADMIN_CREATED', details: { uid: user.uid, email } });
  return { ok: true, uid: user.uid };
});

export const superAdminDeleteAdmin = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  await requireSuperAdmin(uid);

  const targetUid = String(data?.uid ?? '');
  if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'Missing uid.');
  if (targetUid === uid) throw new functions.https.HttpsError('failed-precondition', 'Cannot delete yourself.');

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Failed to delete auth user.');
    }
  }

  const db = admin.firestore();
  await db.collection('admins').doc(targetUid).delete().catch(() => { });
  await db.collection('users').doc(targetUid).delete().catch(() => { });

  await writeSuperAudit({ actorId: uid, type: 'ADMIN_DELETED', details: { uid: targetUid } });
  return { ok: true };
});

export const adminCreateDriver = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (role !== 'admin' || !adminId) throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  if (accountStatus !== 'active') throw new functions.https.HttpsError('permission-denied', 'Admin not active.');

  const email = normalizeEmail(data?.email);
  if (!email || !isValidEmail(email)) throw new functions.https.HttpsError('invalid-argument', 'Invalid email.');

  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code === 'auth/user-not-found') {
      user = await admin.auth().createUser({ email });
    } else {
      throw new functions.https.HttpsError('internal', 'Auth create failed.');
    }
  }

  const db = admin.firestore();
  await db.collection('users').doc(user.uid).set(
    {
      id: user.uid,
      email,
      role: 'driver',
      adminId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await db.collection('drivers').doc(user.uid).set(
    {
      id: user.uid,
      userId: user.uid,
      adminId,
      isOnline: false,
      status: 'idle',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await notifyUserViaRTDB({
    uid: user.uid,
    type: 'driver_onboarded',
    title: 'You were added as a driver',
    body: `Tenant: ${adminId}`,
    data: { adminId },
  });

  return { ok: true, uid: user.uid };
});

export const adminSetDriverStatus = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (role !== 'admin' || !adminId) throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  if (accountStatus !== 'active') throw new functions.https.HttpsError('permission-denied', 'Admin not active.');

  const driverUid = String(data?.uid ?? '');
  const nextStatus = String(data?.status ?? '');
  if (!driverUid) throw new functions.https.HttpsError('invalid-argument', 'Missing uid.');
  if (nextStatus !== 'active' && nextStatus !== 'suspended') throw new functions.https.HttpsError('invalid-argument', 'Invalid status.');

  const userSnap = await admin.firestore().collection('users').doc(driverUid).get();
  const userData = userSnap.data() as any;
  if (userData?.role !== 'driver' || userData?.adminId !== adminId) {
    throw new functions.https.HttpsError('permission-denied', 'Driver not in tenant.');
  }

  await admin.firestore().collection('users').doc(driverUid).set(
    {
      status: nextStatus,
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (nextStatus === 'suspended') {
    await admin.firestore().collection('drivers').doc(driverUid).set(
      { isOnline: false, status: 'idle', updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  return { ok: true };
});

export const adminDeleteDriver = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (role !== 'admin' || !adminId) throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  if (accountStatus !== 'active') throw new functions.https.HttpsError('permission-denied', 'Admin not active.');

  const driverUid = String(data?.uid ?? '');
  if (!driverUid) throw new functions.https.HttpsError('invalid-argument', 'Missing uid.');

  const db = admin.firestore();
  const userSnap = await db.collection('users').doc(driverUid).get();
  const userData = userSnap.data() as any;
  if (userData?.role !== 'driver' || userData?.adminId !== adminId) {
    throw new functions.https.HttpsError('permission-denied', 'Driver not in tenant.');
  }

  const driverSnap = await db.collection('drivers').doc(driverUid).get();
  const driverData = driverSnap.data() as any;
  if (driverData?.adminId && driverData.adminId !== adminId) {
    throw new functions.https.HttpsError('permission-denied', 'Driver not in tenant.');
  }
  if (driverData?.status && driverData.status !== 'idle') {
    throw new functions.https.HttpsError('failed-precondition', 'Driver must be idle before deletion.');
  }

  try {
    await admin.auth().deleteUser(driverUid);
  } catch (e: any) {
    const code = String(e?.code ?? '');
    if (code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Failed to delete auth user.');
    }
  }

  await db.collection('drivers').doc(driverUid).delete().catch(() => { });
  await db.collection('users').doc(driverUid).delete().catch(() => { });
  await admin.database().ref(`locations/${driverUid}`).remove().catch(() => { });
  await admin.database().ref(`notifications/${driverUid}`).remove().catch(() => { });

  return { ok: true };
});

export const adminUpdateOrder = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (role !== 'admin' || !adminId) throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  if (accountStatus !== 'active') throw new functions.https.HttpsError('permission-denied', 'Admin not active.');

  const orderId = String(data?.orderId ?? '');
  if (!orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');

  const pickupLat = Number(data?.pickupLat);
  const pickupLng = Number(data?.pickupLng);
  const dropoffLat = Number(data?.dropoffLat);
  const dropoffLng = Number(data?.dropoffLng);
  const price = Number(data?.price);
  const paymentMethod = String(data?.paymentMethod ?? 'cash');

  if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng) || !Number.isFinite(dropoffLat) || !Number.isFinite(dropoffLng)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates.');
  }
  if (!Number.isFinite(price)) throw new functions.https.HttpsError('invalid-argument', 'Invalid price.');
  if (paymentMethod !== 'cash' && paymentMethod !== 'prepaid') throw new functions.https.HttpsError('invalid-argument', 'Invalid paymentMethod.');

  const db = admin.firestore();
  const orderRef = db.collection('orders').doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Order not found.');
    const order = snap.data() as any;
    if (order.adminId !== adminId) throw new functions.https.HttpsError('permission-denied', 'Wrong tenant.');
    if (order.status !== 'pending') throw new functions.https.HttpsError('failed-precondition', 'Only pending orders can be edited.');

    tx.update(orderRef, {
      pickupLocation: new admin.firestore.GeoPoint(pickupLat, pickupLng),
      dropoffLocation: new admin.firestore.GeoPoint(dropoffLat, dropoffLng),
      price,
      paymentMethod,
      paymentStatus: paymentMethod === 'prepaid' ? 'paid' : 'unpaid',
      paidAt: paymentMethod === 'prepaid' ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
    });
  });

  return { ok: true };
});

export const adminDeleteOrder = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (role !== 'admin' || !adminId) throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  if (accountStatus !== 'active') throw new functions.https.HttpsError('permission-denied', 'Admin not active.');

  const orderId = String(data?.orderId ?? '');
  if (!orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');

  const db = admin.firestore();
  const orderRef = db.collection('orders').doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return;
    const order = snap.data() as any;
    if (order.adminId !== adminId) throw new functions.https.HttpsError('permission-denied', 'Wrong tenant.');
    if (order.status !== 'pending') throw new functions.https.HttpsError('failed-precondition', 'Only pending orders can be deleted.');
    tx.delete(orderRef);
  });

  return { ok: true };
});

export const adminCancelMission = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (role !== 'admin' || !adminId) throw new functions.https.HttpsError('permission-denied', 'Admin only.');
  if (accountStatus !== 'active') throw new functions.https.HttpsError('permission-denied', 'Admin not active.');

  const orderId = String(data?.orderId ?? '');
  if (!orderId) throw new functions.https.HttpsError('invalid-argument', 'Missing orderId.');

  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Order not found.');
    const order = snap.data() as any;
    if (order.adminId !== adminId) throw new functions.https.HttpsError('permission-denied', 'Wrong tenant.');
    if (order.status === 'delivered' || order.status === 'cancelled') return;

    const driverId = (order.driverId as string | undefined) ?? null;
    if (driverId) {
      tx.update(db.collection('drivers').doc(driverId), { status: 'idle', updatedAt: now });
    }
    tx.update(orderRef, { status: 'cancelled', updatedAt: now, updatedBy: uid });
    tx.set(db.collection('order_events').doc(), { orderId, status: 'cancelled', actorId: uid, timestamp: now });
  });

  return { ok: true };
});

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

  const { role, adminId, status: accountStatus } = await getUserRoleAndAdminId(uid);
  if (!role) {
    throw new functions.https.HttpsError('failed-precondition', 'Missing user role.');
  }
  if (role !== 'super_admin' && accountStatus !== 'active') {
    throw new functions.https.HttpsError('permission-denied', 'Account not active.');
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
      if (status !== 'pending' && status !== 'assigned' && status !== 'accepted') {
        throw new functions.https.HttpsError('failed-precondition', 'Can only reassign pending/assigned/accepted orders.');
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
      tx.update(orderRef, { status: 'accepted', driverAcceptedAt: now, updatedAt: now, updatedBy: uid });
      tx.set(eventRef, { orderId, status: 'driver_accepted', actorId: uid, timestamp: now });
      return;
    }

    if (action === 'driver_reject') {
      if (role !== 'driver') throw new functions.https.HttpsError('permission-denied', 'Driver only.');
      if (currentDriverId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not assigned to you.');
      if (status !== 'assigned' && status !== 'accepted') throw new functions.https.HttpsError('failed-precondition', 'Only assigned/accepted orders can be rejected.');
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
      if (status !== 'accepted') throw new functions.https.HttpsError('failed-precondition', 'Order must be accepted.');
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

    if (action === 'driver_collect_cash') {
      if (role !== 'driver') throw new functions.https.HttpsError('permission-denied', 'Driver only.');
      if (currentDriverId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not assigned to you.');
      if (status !== 'delivered') throw new functions.https.HttpsError('failed-precondition', 'Order must be delivered.');
      const paymentMethod = (order?.paymentMethod as string | undefined) ?? 'cash';
      const paymentStatus = (order?.paymentStatus as string | undefined) ?? 'unpaid';
      if (paymentMethod !== 'cash') throw new functions.https.HttpsError('failed-precondition', 'Order is not cash.');
      if (paymentStatus !== 'unpaid') {
        throw new functions.https.HttpsError('failed-precondition', 'Payment already collected.');
      }
      tx.update(orderRef, {
        paymentStatus: 'paid',
        cashCollectedAt: now,
        updatedAt: now,
        updatedBy: uid,
      });
      tx.set(eventRef, { orderId, status: 'cash_collected', actorId: uid, timestamp: now });
      return;
    }

    if (action === 'user_cancel') {
      if (role !== 'user') throw new functions.https.HttpsError('permission-denied', 'User only.');
      if (orderUserId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your order.');
      if (status !== 'pending' && status !== 'assigned' && status !== 'accepted') {
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
});

export const onOrderEventCreated = functions.firestore.document('order_events/{eventId}').onCreate(async (snap, ctx) => {
  const event = snap.data() as any;
  const orderId = String(event?.orderId ?? '');
  const status = String(event?.status ?? '');
  if (!orderId || !status) return;

  const orderSnap = await admin.firestore().collection('orders').doc(orderId).get();
  if (!orderSnap.exists) return;
  const order = orderSnap.data() as any;

  const userId = (order?.userId as string | undefined) ?? null;
  const adminId = (order?.adminId as string | undefined) ?? null;
  const driverId = (order?.driverId as string | undefined) ?? null;

  const targets = [userId, adminId, driverId].filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (targets.length === 0) return;

  const title = 'Order update';
  const body =
    status === 'assigned'
      ? `Order ${orderId} assigned`
      : status === 'driver_accepted'
        ? `Order ${orderId} accepted`
        : status === 'picked'
          ? `Order ${orderId} picked up`
          : status === 'delivered'
            ? `Order ${orderId} delivered`
            : status === 'cancelled'
              ? `Order ${orderId} cancelled`
              : status === 'cash_collected'
                ? `Cash collected for ${orderId}`
                : `Order ${orderId} updated`;

  await Promise.all(
    targets.map(async (uid) => {
      await notifyUserViaRTDB({ uid, type: 'order_event', title, body, data: { orderId, status } });
      const tokens = await getUserPushTokens(uid);
      await sendExpoPush(tokens, { title, body, data: { type: 'order_event', orderId, status } });
    })
  );
});
