import { useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { onValue, ref } from 'firebase/database';

import { OrderMap } from '@/components/order-map';
import { rtdb, firestore } from '@/src/firebase/client';
import { transitionOrder } from '@/src/orders/transition';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: { latitude?: number; longitude?: number } | any;
  dropoffLocation?: { latitude?: number; longitude?: number } | any;
  driverId?: string;
};

type DriverDoc = {
  id: string;
  currentLocation?: { latitude?: number; longitude?: number } | any;
};

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === 'string' ? id : '';
  const [order, setOrder] = React.useState<OrderDoc | null>(null);
  const [driver, setDriver] = React.useState<DriverDoc | null>(null);
  const [driverLive, setDriverLive] = React.useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!orderId) return;
    return onSnapshot(doc(firestore, 'orders', orderId), (snap) => {
      if (!snap.exists()) {
        setOrder(null);
        return;
      }
      setOrder({ id: snap.id, ...(snap.data() as any) } as OrderDoc);
    });
  }, [orderId]);

  React.useEffect(() => {
    const driverId = order?.driverId;
    if (!driverId) {
      setDriver(null);
      setDriverLive(null);
      return;
    }
    return onSnapshot(doc(firestore, 'drivers', driverId), (snap) => {
      if (!snap.exists()) {
        setDriver(null);
        return;
      }
      setDriver({ id: snap.id, ...(snap.data() as any) } as DriverDoc);
    });
  }, [order?.driverId]);

  React.useEffect(() => {
    const driverId = order?.driverId;
    if (!driverId) return;
    const locationRef = ref(rtdb, `locations/${driverId}`);
    const unsubscribe = onValue(locationRef, (snap) => {
      const v = snap.val();
      if (!v || typeof v.lat !== 'number' || typeof v.lng !== 'number') {
        setDriverLive(null);
        return;
      }
      setDriverLive({ lat: v.lat, lng: v.lng });
    });
    return () => unsubscribe();
  }, [order?.driverId]);

  const pickup = order?.pickupLocation
    ? {
      latitude: order.pickupLocation.latitude ?? order.pickupLocation._lat,
      longitude: order.pickupLocation.longitude ?? order.pickupLocation._long,
    }
    : null;
  const dropoff = order?.dropoffLocation
    ? {
      latitude: order.dropoffLocation.latitude ?? order.dropoffLocation._lat,
      longitude: order.dropoffLocation.longitude ?? order.dropoffLocation._long,
    }
    : null;
  const driverLocation = driverLive
    ? { latitude: driverLive.lat, longitude: driverLive.lng }
    : driver?.currentLocation
      ? {
          latitude: driver.currentLocation.latitude ?? driver.currentLocation._lat,
          longitude: driver.currentLocation.longitude ?? driver.currentLocation._long,
        }
      : null;

  const region =
    pickup && dropoff
      ? {
        latitude: (pickup.latitude + dropoff.latitude) / 2,
        longitude: (pickup.longitude + dropoff.longitude) / 2,
        latitudeDelta: Math.abs(pickup.latitude - dropoff.latitude) * 2 + 0.01,
        longitudeDelta: Math.abs(pickup.longitude - dropoff.longitude) * 2 + 0.01,
      }
      : pickup
        ? { latitude: pickup.latitude, longitude: pickup.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
        : { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.02, longitudeDelta: 0.02 };

  async function cancelOrder() {
    if (!orderId) return;
    setBusy(true);
    try {
      await transitionOrder({ action: 'user_cancel', orderId });
    } catch (e: any) {
      Alert.alert('Cancel failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: '800' }}>
          {orderId}
        </Text>
        <Text selectable>status: {order?.status ?? '—'}</Text>
        <Text selectable>{order?.driverId ? `driver: ${order.driverId}` : 'driver: —'}</Text>
      </View>

      <View style={{ height: 360, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' }}>
        <OrderMap region={region} pickup={pickup} dropoff={dropoff} driver={driverLocation} />
      </View>

      {order?.status === 'pending' || order?.status === 'assigned' ? (
        <Pressable
          disabled={busy}
          onPress={cancelOrder}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'rgba(255,0,0,0.12)',
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
            Cancel order
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
