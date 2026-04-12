import { useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { OrderMap } from '@/components/order-map';
import { firestore } from '@/src/firebase/client';
import { transitionOrder } from '@/src/orders/transition';
import { useAppTheme } from '@/src/theme/theme';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: { latitude?: number; longitude?: number } | any;
  dropoffLocation?: { latitude?: number; longitude?: number } | any;
  driverId?: string;
  driverAcceptedAt?: any;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'unpaid' | 'paid';
  price?: number;
};

function formatMoney(v: number) {
  return v.toFixed(2);
}

export default function DriverOrderScreen() {
  const { colors } = useAppTheme();
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

  const friendlyId = `ORDER#${orderId.slice(0, 3).toUpperCase()}-${orderId.slice(3, 6).toUpperCase()}-${orderId.slice(6, 8).toUpperCase()}`;
  const isActive = order?.status !== 'delivered' && order?.status !== 'cancelled';
  const fee = order?.price ?? 0;
  const bonus = 2.5;
  const totalPayout = fee + bonus;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
    >
      <View style={{ gap: 10 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          MISSION IDENTIFIER
        </Text>
        <Text selectable style={{ fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>
          {friendlyId}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderCurve: 'continuous',
              backgroundColor: isActive ? '#D7F5DF' : colors.secondary,
            }}
          >
            <Text selectable style={{ fontWeight: '900', color: isActive ? '#0B5A2A' : colors.text, fontSize: 12, letterSpacing: 0.5 }}>
              {isActive ? 'ACTIVE MISSION' : 'COMPLETED'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              EST. EARNINGS
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(totalPayout)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 220, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.card }}>
        <OrderMap region={region} pickup={pickup} dropoff={dropoff} />
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
            PICKUP
          </Text>
        </View>
      </View>

      <Pressable
        disabled={!pickup}
        onPress={() => pickup && Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pickup.latitude},${pickup.longitude}`)}
        style={{
          paddingVertical: 12,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 0.5, color: colors.text }}>
          ⤴  OPEN PICKUP IN MAPS
        </Text>
      </Pressable>

      <Pressable
        disabled={!dropoff}
        onPress={() => dropoff && Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${dropoff.latitude},${dropoff.longitude}`)}
        style={{
          paddingVertical: 12,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 0.5, color: colors.text }}>
          ➤  OPEN DROPOFF IN MAPS
        </Text>
      </Pressable>

      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>
            MISSION MANIFEST
          </Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.secondary }}>
            <Text selectable style={{ fontWeight: '900', color: colors.text, fontSize: 12 }}>
              3 ITEMS
            </Text>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {[
            { n: '01', title: 'HEAVY CARGO BOX - TYPE A', subtitle: 'REF: BOX-2821', qty: 1 },
            { n: '02', title: 'STANDARD ENVELOPE', subtitle: 'REF: ENV-990', qty: 2 },
          ].map((it) => (
            <View key={it.n} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {it.n}  {it.title}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  {it.subtitle}
                </Text>
              </View>
              <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                x{it.qty}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              DELIVERY FEE
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(fee)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              MISSION BONUS
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(bonus)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.text, fontWeight: '900', letterSpacing: 0.5 }}>
              TOTAL PAYOUT
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              ${formatMoney(totalPayout)}
            </Text>
          </View>
        </View>
      </View>

      {(order?.paymentMethod ?? 'cash') === 'cash' && (order?.paymentStatus ?? 'unpaid') !== 'paid' ? (
        <View
          style={{
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: '#FEF3C7',
            padding: 14,
            gap: 10,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.12)',
          }}
        >
          <Text selectable style={{ color: '#7A4B00', fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
            💰  COLLECT CASH
          </Text>
          <Text selectable style={{ color: '#111827', fontWeight: '900', fontSize: 28, fontVariant: ['tabular-nums'] }}>
            ${formatMoney(fee)}
          </Text>
          <Text selectable style={{ color: '#7A4B00', fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            PAYMENT REQUIRED AT DROPOFF
          </Text>
          <Pressable
            disabled={busy || order?.status !== 'delivered'}
            onPress={() => doAction('driver_collect_cash')}
            style={{
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: busy || order?.status !== 'delivered' ? 'rgba(0,0,0,0.15)' : colors.background,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.25)',
            }}
          >
            <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 0.5, color: '#111827' }}>
              MARK CASH COLLECTED
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          padding: 14,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          PRIMARY EXECUTION ACTIONS
        </Text>

        <Pressable
          disabled={busy || order?.status !== 'accepted'}
          onPress={() => doAction('driver_picked')}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: busy || order?.status !== 'accepted' ? colors.disabled : colors.primary,
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.primaryText }}>
            MARK PICKED UP
          </Text>
        </Pressable>

        <Pressable
          disabled={busy || order?.status !== 'picked'}
          onPress={() => doAction('driver_delivered')}
          style={{
            paddingVertical: 14,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: busy || order?.status !== 'picked' ? colors.disabled : colors.primary,
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.primaryText }}>
            MARK DELIVERED
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            disabled={busy || order?.status !== 'assigned'}
            onPress={() => doAction('driver_reject')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: busy || order?.status !== 'assigned' ? 0.6 : 1,
            }}
          >
            <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 0.5, color: colors.text }}>
              REJECT
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => Linking.openURL('mailto:support@doordrop.com')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 0.5, color: colors.text }}>
              SUPPORT
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
