import { useLocalSearchParams, router } from 'expo-router';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { DriverMap } from '@/components/driver-map';
import { firestore, functionsClient } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

type DriverDoc = {
  id: string;
  adminId?: string;
  isOnline?: boolean;
  status?: 'idle' | 'busy';
  currentLocation?: { latitude?: number; longitude?: number } | any;
  updatedAt?: any;
};

type UserDoc = {
  id: string;
  email?: string;
  role?: string;
  adminId?: string;
  status?: 'active' | 'suspended' | string;
};

type OrderDoc = {
  id: string;
  status?: string;
  updatedAt?: any;
  pickupLocation?: any;
  dropoffLocation?: any;
  price?: number;
  paymentMethod?: 'cash' | 'prepaid';
  paymentStatus?: 'paid' | 'unpaid';
};

function formatLatLng(value: any) {
  const lat = value?.latitude ?? value?._lat ?? null;
  const lng = value?.longitude ?? value?._long ?? null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export default function AdminDriverDetails() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const driverId = typeof id === 'string' ? id : '';
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? null;

  const [driver, setDriver] = React.useState<DriverDoc | null>(null);
  const [userDoc, setUserDoc] = React.useState<UserDoc | null>(null);
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!driverId) return;
    return onSnapshot(doc(firestore, 'drivers', driverId), (snap) => {
      if (!snap.exists()) {
        setDriver(null);
        return;
      }
      setDriver({ id: snap.id, ...(snap.data() as any) } as DriverDoc);
    });
  }, [driverId]);

  React.useEffect(() => {
    if (!driverId) return;
    return onSnapshot(doc(firestore, 'users', driverId), (snap) => {
      if (!snap.exists()) {
        setUserDoc(null);
        return;
      }
      setUserDoc({ id: snap.id, ...(snap.data() as any) } as UserDoc);
    });
  }, [driverId]);

  React.useEffect(() => {
    if (!driverId) return;
    const q = query(
      collection(firestore, 'orders'),
      where('driverId', '==', driverId),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );
    return onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderDoc[]);
    });
  }, [driverId]);

  const location = React.useMemo(() => {
    const loc = driver?.currentLocation;
    const latitude = loc?.latitude ?? loc?._lat ?? null;
    const longitude = loc?.longitude ?? loc?._long ?? null;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return { latitude, longitude };
  }, [driver?.currentLocation]);

  const online = driver?.isOnline ?? false;
  const workStatus = driver?.status ?? 'idle';
  const accountStatus = (userDoc?.status ?? 'active') as string;

  const tenantMismatch =
    adminId && ((driver?.adminId && driver.adminId !== adminId) || (userDoc?.adminId && userDoc.adminId !== adminId));

  async function setStatus(status: 'active' | 'suspended') {
    if (!driverId) return;
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminSetDriverStatus');
      await fn({ uid: driverId, status });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDriver() {
    if (!driverId) return;
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminDeleteDriver');
      await fn({ uid: driverId });
      router.back();
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  if (!driverId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: 'center' }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          Missing driver id.
        </Text>
      </View>
    );
  }

  if (tenantMismatch) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: 'center' }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          This driver is not in your tenant.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
    >
      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          DRIVER
        </Text>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 20 }}>
          {userDoc?.email ?? driverId}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          UID: {driverId}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: online ? '#D7F5DF' : colors.secondary }}>
            <Text selectable style={{ fontWeight: '900', fontSize: 12, color: online ? '#0B5A2A' : colors.text }}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.secondary }}>
            <Text selectable style={{ fontWeight: '900', fontSize: 12, color: colors.text }}>
              {workStatus.toUpperCase()}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.secondary }}>
            <Text selectable style={{ fontWeight: '900', fontSize: 12, color: colors.text }}>
              {(accountStatus ?? 'active').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 180, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
        <DriverMap driver={location} />
      </View>

      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          ACTIONS
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            disabled={busy || accountStatus === 'active'}
            onPress={() => setStatus('active')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: accountStatus === 'active' ? colors.disabled : colors.primary,
            }}
          >
            <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900' }}>
              ACTIVATE
            </Text>
          </Pressable>
          <Pressable
            disabled={busy || accountStatus === 'suspended'}
            onPress={() => setStatus('suspended')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: accountStatus === 'suspended' ? colors.disabled : colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900' }}>
              SUSPEND
            </Text>
          </Pressable>
        </View>

        <Pressable
          disabled={busy}
          onPress={() =>
            Alert.alert('Delete driver?', 'This removes the driver account and data for this tenant.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: deleteDriver },
            ])
          }
          style={{
            paddingVertical: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900' }}>
            DELETE DRIVER
          </Text>
        </Pressable>
      </View>

      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          RECENT ORDERS
        </Text>
        {orders.length === 0 ? (
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
            No orders found for this driver.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {orders.map((o) => (
              <View key={o.id} style={{ padding: 12, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.background, gap: 6 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {o.id}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
                  {String(o.status ?? '—').toUpperCase()} · ${(o.price ?? 0).toFixed(2)} {(o.paymentMethod ?? 'cash').toUpperCase()} ·{' '}
                  {(o.paymentStatus ?? 'unpaid').toUpperCase()}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
                  Pickup: {formatLatLng(o.pickupLocation)}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
                  Dropoff: {formatLatLng(o.dropoffLocation)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
