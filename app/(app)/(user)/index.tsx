import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GeoPoint, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { firestore } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';

type OrderDoc = {
  id: string;
  status: string;
  driverId?: string;
  adminId: string;
};

export default function UserHome() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid;

  const [adminId, setAdminId] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'prepaid'>('cash');
  const [price, setPrice] = React.useState('12');
  const [pickup, setPickup] = React.useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLat, setDropoffLat] = React.useState('');
  const [dropoffLng, setDropoffLng] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);

  React.useEffect(() => {
    if (!uid) return;
    const q = query(collection(firestore, 'orders'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[]);
    });
  }, [uid]);

  async function capturePickup() {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) {
      Alert.alert('Location permission required', 'Enable location permission to use current pickup location.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function createOrder() {
    if (!uid) return;
    const tAdminId = adminId.trim();
    const dLat = Number(dropoffLat);
    const dLng = Number(dropoffLng);
    const p = Number(price);

    if (!tAdminId) {
      Alert.alert('Missing adminId', 'Enter the tenant adminId for this order.');
      return;
    }
    if (!pickup) {
      Alert.alert('Missing pickup', 'Tap "Use current pickup" first.');
      return;
    }
    if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) {
      Alert.alert('Missing dropoff', 'Enter dropoff latitude and longitude.');
      return;
    }

    setBusy(true);
    try {
      await addDoc(collection(firestore, 'orders'), {
        userId: uid,
        adminId: tAdminId,
        pickupLocation: new GeoPoint(pickup.lat, pickup.lng),
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
      setDropoffLat('');
      setDropoffLng('');
    } catch (e: any) {
      Alert.alert('Create order failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 20, fontWeight: '800' }}>
          Create Order
        </Text>

        <View style={{ gap: 6 }}>
          <Text selectable>Tenant adminId</Text>
          <TextInput
            value={adminId}
            onChangeText={setAdminId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="adminId"
            style={{
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.12)',
              padding: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
            }}
          />
        </View>

        <Pressable
          onPress={capturePickup}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: 'rgba(0,0,0,0.08)',
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
            Use current pickup
          </Text>
        </Pressable>

        <Text selectable style={{ fontVariant: ['tabular-nums'] }}>
          pickup: {pickup ? `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}` : '—'}
        </Text>

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
            paddingVertical: 14,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'black',
          }}
        >
          <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
            Create order
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: '800' }}>
          My Orders
        </Text>
        {orders.length === 0 ? <Text selectable>No orders yet.</Text> : null}
        {orders.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => router.push(`/(app)/(user)/orders/${o.id}`)}
            style={{
              padding: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: 'rgba(0,0,0,0.06)',
              gap: 6,
            }}
          >
            <Text selectable style={{ fontWeight: '800' }}>
              {o.id}
            </Text>
            <Text selectable>
              {o.status}
              {o.driverId ? ` · driver: ${o.driverId}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
