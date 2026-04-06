import { useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { OrderMap } from '@/components/order-map';
import { transitionOrder } from '@/src/orders/transition';
import { firestore } from '@/src/firebase/client';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: { latitude?: number; longitude?: number } | any;
  dropoffLocation?: { latitude?: number; longitude?: number } | any;
  driverId?: string;
  driverAcceptedAt?: any;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
};

export default function DriverOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === 'string' ? id : '';
  const [order, setOrder] = React.useState<OrderDoc | null>(null);
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

  async function doAction(action: Parameters<typeof transitionOrder>[0]['action']) {
    if (!orderId) return;
    setBusy(true);
    try {
      await transitionOrder({ action, orderId });
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
        <Text selectable>
          payment: {(order?.paymentMethod ?? 'cash').toUpperCase()} · {(order?.paymentStatus ?? 'unpaid').toUpperCase()}
        </Text>
      </View>

      <View style={{ height: 360, borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' }}>
        <OrderMap region={region} pickup={pickup} dropoff={dropoff} />
      </View>

      {pickup ? (
        <Pressable
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pickup.latitude},${pickup.longitude}`)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: 'rgba(0,0,0,0.08)',
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
            Open pickup in Maps
          </Text>
        </Pressable>
      ) : null}

      {dropoff ? (
        <Pressable
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${dropoff.latitude},${dropoff.longitude}`)}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: 'rgba(0,0,0,0.08)',
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '800' }}>
            Open dropoff in Maps
          </Text>
        </Pressable>
      ) : null}

      <View style={{ gap: 10 }}>
        {order?.status === 'assigned' && !order?.driverAcceptedAt ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              disabled={busy}
              onPress={() => doAction('driver_accept')}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderCurve: 'continuous',
                backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'black',
              }}
            >
              <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
                Accept
              </Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => doAction('driver_reject')}
              style={{
                flex: 1,
                paddingVertical: 12,
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

        {order?.status === 'assigned' && order?.driverAcceptedAt ? (
          <Pressable
            disabled={busy}
            onPress={() => doAction('driver_picked')}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'black',
            }}
          >
            <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
              Mark picked up
            </Text>
          </Pressable>
        ) : null}

        {order?.status === 'picked' ? (
          <Pressable
            disabled={busy}
            onPress={() => doAction('driver_delivered')}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'black',
            }}
          >
            <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
              Mark delivered
            </Text>
          </Pressable>
        ) : null}

        {order?.status === 'delivered' && (order?.paymentMethod ?? 'cash') === 'cash' && (order?.paymentStatus ?? 'unpaid') !== 'paid' ? (
          <Pressable
            disabled={busy}
            onPress={() => doAction('driver_collect_cash')}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: busy ? 'rgba(0,0,0,0.15)' : 'black',
            }}
          >
            <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>
              Collect cash
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
