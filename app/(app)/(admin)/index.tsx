import { GeoPoint, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AdminMap } from '@/components/admin-map';
import { firestore } from '@/src/firebase/client';
import { transitionOrder } from '@/src/orders/transition';
import { useAuthStore } from '@/src/store/auth-store';

type DriverDoc = {
  id: string;
  adminId: string;
  isOnline: boolean;
  status: 'idle' | 'busy';
  currentLocation?: { latitude: number; longitude: number } | any;
};

type OrderDoc = {
  id: string;
  adminId: string;
  userId: string;
  driverId?: string;
  status: 'pending' | 'assigned' | 'picked' | 'delivered' | 'cancelled';
  price?: number;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
  pickupLocation?: any;
  dropoffLocation?: any;
};

export default function AdminHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId;
  const [drivers, setDrivers] = React.useState<DriverDoc[]>([]);
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [orderUserId, setOrderUserId] = React.useState('');
  const [pickupLat, setPickupLat] = React.useState('');
  const [pickupLng, setPickupLng] = React.useState('');
  const [dropoffLat, setDropoffLat] = React.useState('');
  const [dropoffLng, setDropoffLng] = React.useState('');
  const [price, setPrice] = React.useState('12');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'prepaid'>('cash');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!adminId) return;
    const q = query(collection(firestore, 'drivers'), where('adminId', '==', adminId));
    return onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as DriverDoc[];
      setDrivers(next);
    });
  }, [adminId]);

  React.useEffect(() => {
    if (!adminId) return;
    const q = query(collection(firestore, 'orders'), where('adminId', '==', adminId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[];
      setOrders(next);
    });
  }, [adminId]);

  async function assignFirstIdle(orderId: string) {
    if (!adminId) return;
    const uid = user?.uid;
    const candidate = drivers.find((d) => d.isOnline && d.status === 'idle');
    if (!candidate) {
      Alert.alert('No idle drivers', 'Ask a driver to go online.');
      return;
    }
    try {
      await transitionOrder({ action: 'admin_assign', orderId, driverId: candidate.id });
    } catch (e: any) {
      Alert.alert('Assignment failed', e?.message ?? 'Unknown error');
    }
  }

  async function reassignFirstIdle(order: OrderDoc) {
    if (!adminId) return;
    const uid = user?.uid;
    const candidate = drivers.find((d) => d.isOnline && d.status === 'idle' && d.id !== order.driverId);
    if (!candidate) {
      Alert.alert('No idle drivers', 'Ask a driver to go online.');
      return;
    }
    try {
      await transitionOrder({ action: 'admin_reassign', orderId: order.id, driverId: candidate.id });
    } catch (e: any) {
      Alert.alert('Reassign failed', e?.message ?? 'Unknown error');
    }
  }

  async function createOrder() {
    const uid = user?.uid;
    if (!adminId || !uid) return;

    const tUserId = orderUserId.trim() || uid;
    const pLat = Number(pickupLat);
    const pLng = Number(pickupLng);
    const dLat = Number(dropoffLat);
    const dLng = Number(dropoffLng);
    const p = Number(price);

    if (!Number.isFinite(pLat) || !Number.isFinite(pLng) || !Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      Alert.alert('Missing coordinates', 'Enter pickup and dropoff coordinates.');
      return;
    }

    setBusy(true);
    try {
      await addDoc(collection(firestore, 'orders'), {
        userId: tUserId,
        adminId,
        pickupLocation: new GeoPoint(pLat, pLng),
        dropoffLocation: new GeoPoint(dLat, dLng),
        status: 'pending',
        price: Number.isFinite(p) ? p : 0,
        paymentMethod,
        paymentStatus: paymentMethod === 'prepaid' ? 'paid' : 'unpaid',
        paidAt: paymentMethod === 'prepaid' ? serverTimestamp() : null,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });
      setPickupLat('');
      setPickupLng('');
      setDropoffLat('');
      setDropoffLng('');
    } catch (e: any) {
      Alert.alert('Create order failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  const selectedOrder = React.useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  const selectedPickup = selectedOrder?.pickupLocation
    ? {
        latitude: selectedOrder.pickupLocation.latitude ?? selectedOrder.pickupLocation._lat,
        longitude: selectedOrder.pickupLocation.longitude ?? selectedOrder.pickupLocation._long,
      }
    : null;

  const selectedDropoff = selectedOrder?.dropoffLocation
    ? {
        latitude: selectedOrder.dropoffLocation.latitude ?? selectedOrder.dropoffLocation._lat,
        longitude: selectedOrder.dropoffLocation.longitude ?? selectedOrder.dropoffLocation._long,
      }
    : null;

  const driverMarkers = React.useMemo(() => {
    return drivers
      .map((d) => {
        const loc = d.currentLocation;
        const latitude = loc?.latitude ?? loc?._lat ?? null;
        const longitude = loc?.longitude ?? loc?._long ?? null;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
        return { id: d.id, location: { latitude, longitude } };
      })
      .filter((v): v is { id: string; location: { latitude: number; longitude: number } } => v !== null);
  }, [drivers]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 20, fontWeight: '800' }}>
          Tenant
        </Text>
        <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
          adminId: {adminId ?? '—'}
        </Text>
      </View>

      <View style={{ height: 260, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' }}>
        <AdminMap drivers={driverMarkers} pickup={selectedPickup} dropoff={selectedDropoff} />
      </View>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: '800' }}>
          Create Order
        </Text>

        <View style={{ gap: 6 }}>
          <Text selectable>User ID (optional)</Text>
          <TextInput
            value={orderUserId}
            onChangeText={setOrderUserId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="defaults to your uid"
            style={{
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.12)',
              padding: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable>Pickup lat</Text>
            <TextInput
              value={pickupLat}
              onChangeText={setPickupLat}
              placeholder="36.7"
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                padding: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable>Pickup lng</Text>
            <TextInput
              value={pickupLng}
              onChangeText={setPickupLng}
              placeholder="3.0"
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                padding: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
              }}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable>Dropoff lat</Text>
            <TextInput
              value={dropoffLat}
              onChangeText={setDropoffLat}
              placeholder="36.7"
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                padding: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable>Dropoff lng</Text>
            <TextInput
              value={dropoffLng}
              onChangeText={setDropoffLng}
              placeholder="3.0"
              keyboardType="decimal-pad"
              style={{
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.12)',
                padding: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
              }}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text selectable>Price</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="12"
            keyboardType="decimal-pad"
            style={{
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.12)',
              padding: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {(['cash', 'prepaid'] as const).map((m) => {
            const selected = m === paymentMethod;
            return (
              <Pressable
                key={m}
                onPress={() => setPaymentMethod(m)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? 'black' : 'rgba(0,0,0,0.08)',
                }}
              >
                <Text selectable style={{ color: selected ? 'white' : 'black', fontWeight: '800', textTransform: 'capitalize' }}>
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={busy}
          onPress={createOrder}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'black',
          }}
        >
          <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
            Create pending order
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: '800' }}>
          Drivers
        </Text>
        {drivers.length === 0 ? <Text selectable>No drivers yet.</Text> : null}
        {drivers.map((d) => (
          <View
            key={d.id}
            style={{
              padding: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: 'rgba(0,0,0,0.06)',
              gap: 6,
            }}
          >
            <Text selectable style={{ fontWeight: '800' }}>
              {d.id}
            </Text>
            <Text selectable>
              {d.isOnline ? 'online' : 'offline'} · {d.status}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: '800' }}>
          Orders
        </Text>
        {orders.length === 0 ? <Text selectable>No orders yet.</Text> : null}
        {orders.map((o) => (
          <View
            key={o.id}
            style={{
              padding: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: 'rgba(0,0,0,0.06)',
              gap: 8,
            }}
          >
            <View style={{ gap: 4 }}>
              <Pressable onPress={() => setSelectedOrderId(o.id)}>
                <Text selectable style={{ fontWeight: '800' }}>
                  {o.id}
                </Text>
              </Pressable>
              <Text selectable>
                status: {o.status}
                {o.driverId ? ` · driver: ${o.driverId}` : ''}
              </Text>
              <Text selectable>
                payment: {(o.paymentMethod ?? 'cash').toUpperCase()} · {(o.paymentStatus ?? 'unpaid').toUpperCase()}
              </Text>
            </View>

            {o.status === 'pending' ? (
              <Pressable
                onPress={() => assignFirstIdle(o.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: 'black',
                }}
              >
                <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
                  Assign first idle driver
                </Text>
              </Pressable>
            ) : null}

            {o.driverId && (o.status === 'assigned' || o.status === 'picked') ? (
              <Pressable
                onPress={() => reassignFirstIdle(o)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: 'rgba(0,0,0,0.08)',
                }}
              >
                <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
                  Reassign to idle driver
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
