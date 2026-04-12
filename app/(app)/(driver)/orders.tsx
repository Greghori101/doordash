import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { firestore } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: any;
  dropoffLocation?: any;
  driverAcceptedAt?: any;
  price?: number;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
};

function formatLatLng(value: any) {
  const lat = value?.latitude ?? value?._lat ?? null;
  const lng = value?.longitude ?? value?._long ?? null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function statusChip(order: OrderDoc) {
  if (order.status === 'assigned' && !order.driverAcceptedAt) return { label: 'NEW', bg: '#D7F5DF', fg: '#0B5A2A' };
  if (order.status === 'accepted') return { label: 'ACCEPTED', bg: '#EAEAEA', fg: 'rgba(0,0,0,0.7)' };
  if (order.status === 'picked') return { label: 'PICKED UP', bg: '#EAEAEA', fg: 'rgba(0,0,0,0.7)' };
  if (order.status === 'delivered') return { label: 'DELIVERED', bg: '#D7F5DF', fg: '#0B5A2A' };
  return { label: order.status.toUpperCase(), bg: '#EAEAEA', fg: 'rgba(0,0,0,0.7)' };
}

export default function DriverOrders() {
  const { colors } = useAppTheme();
  const uid = useAuthStore((s) => s.user?.uid) ?? null;
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);

  React.useEffect(() => {
    if (!uid) return;
    const q = query(collection(firestore, 'orders'), where('driverId', '==', uid), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[]));
  }, [uid]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 1 }}>
        ACTIVE MANIFEST
      </Text>

      {orders.length === 0 ? (
        <Text selectable style={{ color: colors.mutedText }}>
          No orders yet.
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        {orders.map((o) => {
          const chip = statusChip(o);
          const price = (o.price ?? 0).toFixed(2);
          const method = (o.paymentMethod ?? 'cash').toUpperCase();
          return (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/(app)/(driver)/orders/${o.id}`)}
              style={{
                padding: 14,
                borderRadius: 18,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text selectable style={{ fontWeight: '900', color: colors.text }}>
                  #{o.id.slice(0, 10).toUpperCase()}
                </Text>
                <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: chip.bg }}>
                  <Text selectable style={{ fontWeight: '900', color: chip.fg, fontSize: 12 }}>
                    {chip.label}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
                  ▶ ORIGIN: {formatLatLng(o.pickupLocation)}
                </Text>
                <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
                  ● DEST: {formatLatLng(o.dropoffLocation)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
                  {method} · {(o.paymentStatus ?? 'unpaid').toUpperCase()}
                </Text>
                <Text selectable style={{ color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                  ${price}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
