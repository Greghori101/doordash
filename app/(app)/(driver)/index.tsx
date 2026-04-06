import * as Location from 'expo-location';
import { GeoPoint, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { firestore } from '@/src/firebase/client';
import { startDriverBackgroundLocation, stopDriverBackgroundLocation } from '@/src/location/background';
import { writeDriverLocationToRTDB } from '@/src/location/rtdb-location';
import { transitionOrder } from '@/src/orders/transition';
import { useAuthStore } from '@/src/store/auth-store';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: any;
  dropoffLocation?: any;
  updatedAt?: any;
  driverAcceptedAt?: any;
};

export default function DriverHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const uid = user?.uid;
  const [isOnline, setIsOnline] = React.useState(false);
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);
  const watchRef = React.useRef<Location.LocationSubscription | null>(null);

  React.useEffect(() => {
    if (!uid) return;
    const q = query(collection(firestore, 'orders'), where('driverId', '==', uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[]);
    });
  }, [uid]);

  async function updateDriverDoc(next: Partial<any>) {
    if (!uid) return;
    await updateDoc(doc(firestore, 'drivers', uid), { ...next, updatedAt: serverTimestamp() });
  }

  async function acceptOrder(orderId: string) {
    if (!uid) return;
    try {
      await transitionOrder({ action: 'driver_accept', orderId });
    } catch (e: any) {
      Alert.alert('Accept failed', e?.message ?? 'Unknown error');
    }
  }

  async function rejectOrder(orderId: string) {
    if (!uid) return;
    try {
      await transitionOrder({ action: 'driver_reject', orderId });
    } catch (e: any) {
      Alert.alert('Reject failed', e?.message ?? 'Unknown error');
    }
  }

  async function markPicked(orderId: string) {
    if (!uid) return;
    try {
      await transitionOrder({ action: 'driver_picked', orderId });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    }
  }

  async function markDelivered(orderId: string) {
    if (!uid) return;
    try {
      await transitionOrder({ action: 'driver_delivered', orderId });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    }
  }

  async function startTracking() {
    if (!uid) return;
    if (!profile?.adminId) {
      Alert.alert('Missing adminId', 'Select role again and provide your adminId.');
      return;
    }
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) {
      Alert.alert('Location permission required', 'Enable location permission to go online.');
      return;
    }

    await updateDriverDoc({ isOnline: true, status: 'idle', adminId: profile.adminId, userId: uid, id: uid });
    setIsOnline(true);

    startDriverBackgroundLocation({ driverId: uid }).catch(() => {});

    watchRef.current?.remove();
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 4000,
        distanceInterval: 5,
      },
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          await updateDriverDoc({ currentLocation: new GeoPoint(lat, lng) });
          await writeDriverLocationToRTDB({
            driverId: uid,
            lat,
            lng,
            heading: typeof pos.coords.heading === 'number' ? pos.coords.heading : null,
            speed: typeof pos.coords.speed === 'number' ? pos.coords.speed : null,
          });
        } catch { }
      }
    );
  }

  async function stopTracking() {
    watchRef.current?.remove();
    watchRef.current = null;
    setIsOnline(false);
    if (!uid) return;
    try {
      await updateDriverDoc({ isOnline: false, status: 'idle' });
      await stopDriverBackgroundLocation();
    } catch (e: any) {
      Alert.alert('Could not update status', e?.message ?? 'Unknown error');
    }
  }

  React.useEffect(() => {
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 20, fontWeight: '800' }}>
          Status
        </Text>
        <Text selectable>
          {isOnline ? 'online' : 'offline'}
          {coords ? ` · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : ''}
        </Text>
      </View>

      <Pressable
        onPress={isOnline ? stopTracking : startTracking}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: isOnline ? 'rgba(0,0,0,0.08)' : 'black',
        }}
      >
        <Text selectable style={{ color: isOnline ? 'black' : 'white', textAlign: 'center', fontWeight: '800' }}>
          {isOnline ? 'Go offline' : 'Go online'}
        </Text>
      </Pressable>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: '800' }}>
          Assigned Orders
        </Text>
        {orders.length === 0 ? <Text selectable>No assigned orders yet.</Text> : null}
        {orders.map((o) => (
          <View
            key={o.id}
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
            <Text selectable>status: {o.status}</Text>
            {o.status === 'assigned' && !o.driverAcceptedAt ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable
                  onPress={() => acceptOrder(o.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    backgroundColor: 'black',
                  }}
                >
                  <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
                    Accept
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => rejectOrder(o.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                  }}
                >
                  <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
                    Reject
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {o.status === 'assigned' && o.driverAcceptedAt ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable
                  onPress={() => markPicked(o.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    backgroundColor: 'black',
                  }}
                >
                  <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
                    Mark picked up
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => rejectOrder(o.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    backgroundColor: 'rgba(0,0,0,0.08)',
                  }}
                >
                  <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
                    Reject
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {o.status === 'picked' ? (
              <Pressable
                onPress={() => markDelivered(o.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: 'black',
                  marginTop: 6,
                }}
              >
                <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
                  Mark delivered
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
