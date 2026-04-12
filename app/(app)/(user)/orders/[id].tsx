import { useLocalSearchParams } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { doc, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { OrderMap } from '@/components/order-map';
import { firestore, rtdb } from '@/src/firebase/client';
import { transitionOrder } from '@/src/orders/transition';
import { useAppTheme } from '@/src/theme/theme';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: { latitude?: number; longitude?: number } | any;
  dropoffLocation?: { latitude?: number; longitude?: number } | any;
  driverId?: string;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
  price?: number;
};

type DriverDoc = {
  id: string;
  currentLocation?: { latitude?: number; longitude?: number } | any;
};

function formatLatLng(value: any) {
  const lat = value?.latitude ?? value?._lat ?? null;
  const lng = value?.longitude ?? value?._long ?? null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatMoney(v: number) {
  return v.toFixed(2);
}

export default function OrderScreen() {
  const { colors } = useAppTheme();
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

  const canCancel = order?.status === 'pending' || order?.status === 'assigned' || order?.status === 'accepted';
  const baseFreight = order?.price ?? 0;
  const prioritySurge = 12.5;
  const insurance = 5;
  const total = baseFreight + prioritySurge + insurance;
  const inTransit = order?.status === 'assigned' || order?.status === 'accepted' || order?.status === 'picked';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
    >
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 22, letterSpacing: 1 }}>
          {inTransit ? 'IN TRANSIT' : (order?.status ?? '—').toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#D7F5DF' }}>
            <Text selectable style={{ color: '#0B5A2A', fontWeight: '900', letterSpacing: 0.5, fontSize: 12 }}>
              LIVE UPDATING
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 200, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.card }}>
        <OrderMap region={region} pickup={pickup} dropoff={dropoff} driver={driverLocation} />
        <View
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
            EST. ARRIVAL
          </Text>
          <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            14:22 PM
          </Text>
        </View>
      </View>

      <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, padding: 14, gap: 12 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          LOGISTICS MANIFEST
        </Text>

        <View style={{ borderRadius: 16, borderCurve: 'continuous', backgroundColor: colors.background, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              PICKUP ORIGIN
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
              {pickup ? `HUB_NORTH_22 | ${formatLatLng(order?.pickupLocation)}` : '—'}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ gap: 4 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              DROP DESTINATION
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
              {dropoff ? `RES_402 | ${formatLatLng(order?.dropoffLocation)}` : '—'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, padding: 14, gap: 12 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          DRIVER IDENTITY
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
              <Text selectable style={{ fontWeight: '900', color: colors.text }}>
                {order?.driverId ? order.driverId.slice(0, 2).toUpperCase() : '—'}
              </Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text selectable style={{ fontWeight: '900', color: colors.text }}>
                {order?.driverId ? 'MARCUS REED' : 'UNASSIGNED'}
              </Text>
              <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                ID: {order?.driverId ?? '—'}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', fontSize: 12 }}>
              ★ 4.8/5
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
              12k+ rides
            </Text>
          </View>
        </View>
        <Pressable
          disabled={!order?.driverId}
          onPress={() => Linking.openURL('mailto:support@doordrop.com')}
          style={{
            paddingVertical: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            opacity: order?.driverId ? 1 : 0.5,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
            CONTACT DRIVER
          </Text>
        </Pressable>
      </View>

      <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.primary, padding: 14, gap: 12 }}>
        <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          BILLING SUMMARY
        </Text>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              BASE FREIGHT
            </Text>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(baseFreight)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              PRIORITY SURGE
            </Text>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(prioritySurge)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              INSURANCE (FIXED)
            </Text>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(insurance)}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1 }}>
            TOTAL AMOUNT
          </Text>
          <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] }}>
            ${formatMoney(total)}
          </Text>
        </View>

        <View style={{ borderRadius: 16, borderCurve: 'continuous', backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, gap: 8 }}>
          <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            PAYMENT METHOD
          </Text>
          <Text selectable style={{ color: colors.primaryText, fontWeight: '900' }}>
            {(order?.paymentMethod ?? 'cash') === 'prepaid' ? 'PREPAID - VISA •••• 8821' : 'CASH - PAY AT DROPOFF'}
          </Text>
          <Text selectable style={{ color: '#22C55E', fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            STATUS
          </Text>
          <Text selectable style={{ color: '#22C55E', fontWeight: '900' }}>
            {(order?.paymentStatus ?? 'unpaid') === 'paid' ? 'PAID & VERIFIED' : 'UNPAID'}
          </Text>
        </View>
      </View>

      <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, padding: 14, gap: 12 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          ORDER TIMELINE
        </Text>

        <View style={{ gap: 10 }}>
          {[
            { label: 'ORDER CONFIRMED', ok: true, time: '12:30 PM' },
            { label: 'DRIVER ASSIGNED', ok: Boolean(order?.driverId), time: order?.driverId ? '12:45 PM' : 'PENDING...' },
            { label: 'IN TRANSIT', ok: inTransit, time: inTransit ? '01:12 PM (CURRENT)' : 'PENDING...' },
            { label: 'DELIVERED', ok: order?.status === 'delivered', time: order?.status === 'delivered' ? 'DONE' : 'PENDING...' },
          ].map((s) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: s.ok ? '#22C55E' : colors.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text selectable style={{ color: s.ok ? '#052E14' : colors.mutedText, fontWeight: '900', fontSize: 12 }}>
                  {s.ok ? '✓' : '•'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {s.label}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  {s.time}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => Linking.openURL('mailto:support@doordrop.com')}
        style={{
          paddingVertical: 14,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: colors.primary,
        }}
      >
        <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
          SUPPORT CHAT
        </Text>
      </Pressable>

      <Pressable
        disabled={busy || !canCancel}
        onPress={cancelOrder}
        style={{
          paddingVertical: 14,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: '#EF4444',
          opacity: busy || !canCancel ? 0.5 : 1,
        }}
      >
        <Text selectable style={{ color: '#EF4444', textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
          CANCEL ORDER
        </Text>
      </Pressable>
    </ScrollView>
  );
}
