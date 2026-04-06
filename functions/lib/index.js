"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderCreated = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v1"));
admin.initializeApp();
function toLatLng(value) {
    if (!value)
        return null;
    const lat = typeof value.latitude === 'number' ? value.latitude : typeof value._lat === 'number' ? value._lat : null;
    const lng = typeof value.longitude === 'number' ? value.longitude : typeof value._long === 'number' ? value._long : null;
    if (lat == null || lng == null)
        return null;
    return { lat, lng };
}
function haversineMeters(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const aa = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
}
exports.onOrderCreated = functions.firestore.document('orders/{orderId}').onCreate(async (snap, ctx) => {
    const orderId = ctx.params.orderId;
    const order = snap.data();
    const adminId = order?.adminId;
    const status = order?.status;
    const pickup = toLatLng(order?.pickupLocation);
    if (!adminId)
        return;
    if (status && status !== 'pending')
        return;
    if (order?.driverId)
        return;
    const driversQuery = await admin
        .firestore()
        .collection('drivers')
        .where('adminId', '==', adminId)
        .where('isOnline', '==', true)
        .where('status', '==', 'idle')
        .limit(25)
        .get();
    if (driversQuery.empty)
        return;
    const candidates = driversQuery.docs
        .map((d) => ({ id: d.id, ref: d.ref, data: d.data(), location: toLatLng(d.data().currentLocation) }))
        .sort((a, b) => {
        if (!pickup)
            return 0;
        if (!a.location && !b.location)
            return 0;
        if (!a.location)
            return 1;
        if (!b.location)
            return -1;
        return haversineMeters(pickup, a.location) - haversineMeters(pickup, b.location);
    });
    const chosen = candidates[0];
    if (!chosen)
        return;
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const eventsRef = admin.firestore().collection('order_events').doc();
    await admin.firestore().runTransaction(async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists)
            return;
        const current = orderSnap.data();
        if (current.driverId)
            return;
        if (current.status && current.status !== 'pending')
            return;
        const driverSnap = await tx.get(chosen.ref);
        if (!driverSnap.exists)
            return;
        const driver = driverSnap.data();
        if (driver.adminId !== adminId)
            return;
        if (driver.isOnline !== true)
            return;
        if (driver.status !== 'idle')
            return;
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
});
