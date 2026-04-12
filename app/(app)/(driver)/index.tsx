import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GeoPoint, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { DriverMap } from '@/components/driver-map';
import { useBatteryStatus } from '@/src/driver/use-battery';
import { firestore } from '@/src/firebase/client';
import { startDriverBackgroundLocation, stopDriverBackgroundLocation } from '@/src/location/background';
import { writeDriverLocationToRTDB } from '@/src/location/rtdb-location';
import { transitionOrder } from '@/src/orders/transition';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

type OrderDoc = {
  id: string;
  status: string;
  pickupLocation?: any;
  dropoffLocation?: any;
  updatedAt?: any;
  driverAcceptedAt?: any;
  price?: number;
};

function formatLatLng(value: any) {
  const lat = value?.latitude ?? value?._lat ?? null;
  const lng = value?.longitude ?? value?._long ?? null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export default function DriverHome() {
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const uid = user?.uid;
  const [isOnline, setIsOnline] = React.useState(false);
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [orders, setOrders] = React.useState<OrderDoc[]>([]);
  const watchRef = React.useRef<Location.LocationSubscription | null>(null);
  const battery = useBatteryStatus();

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

    startDriverBackgroundLocation({ driverId: uid }).catch(() => { });

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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          padding: 16,
          gap: 10,
        }}
      >
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          SYSTEM STATUS
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: isOnline ? '#16A34A' : colors.mutedText }} />
          <Text selectable style={{ fontWeight: '900', color: isOnline ? '#16A34A' : colors.mutedText, letterSpacing: 1 }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>

        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            COORDINATES
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {coords ? `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° W` : '—'}
          </Text>
        </View>

        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            BATTERY
          </Text>
          <Text selectable style={{ color: '#16A34A', fontWeight: '900' }}>
            {battery.percent == null ? '—' : `${battery.percent}%`} {battery.isCharging ? '(CHARGING)' : ''}
          </Text>
        </View>

        <Pressable
          onPress={isOnline ? stopTracking : startTracking}
          style={{
            paddingVertical: 14,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            marginTop: 6,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
            {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: 220, borderRadius: 18, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.card }}>
        <DriverMap driver={coords ? { latitude: coords.lat, longitude: coords.lng } : null} />
        <Pressable
          onPress={async () => {
            const fg = await Location.requestForegroundPermissionsAsync();
            if (!fg.granted) return;
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            width: 38,
            height: 38,
            borderRadius: 12,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text selectable style={{ fontWeight: '900', color: colors.text }}>
            ⦿
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900', letterSpacing: 1 }}>
          ACTIVE MANIFEST
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          {orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length} ORDERS PENDING
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {orders
          .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
          .slice(0, 6)
          .map((o) => {
            const showAcceptReject = o.status === 'assigned' && !o.driverAcceptedAt;
            const showPicked = o.status === 'accepted';
            const showDelivered = o.status === 'picked';

            return (
              <View
                key={o.id}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  borderCurve: 'continuous',
                  backgroundColor: colors.card,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text selectable style={{ fontWeight: '900', color: colors.text }}>
                    #{o.id.slice(0, 10).toUpperCase()}
                  </Text>
                  {showAcceptReject ? (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#D7F5DF' }}>
                      <Text selectable style={{ fontWeight: '900', color: '#0B5A2A', fontSize: 12 }}>
                        NEW
                      </Text>
                    </View>
                  ) : showDelivered ? (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EAEAEA' }}>
                      <Text selectable style={{ fontWeight: '900', color: 'rgba(0,0,0,0.7)', fontSize: 12 }}>
                        PICKED UP
                      </Text>
                    </View>
                  ) : showPicked ? (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EAEAEA' }}>
                      <Text selectable style={{ fontWeight: '900', color: 'rgba(0,0,0,0.7)', fontSize: 12 }}>
                        ACCEPTED
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable onPress={() => router.push(`/(app)/(driver)/orders/${o.id}`)} style={{ gap: 6 }}>
                  <Text selectable style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>
                    ▶ ORIGIN: {formatLatLng(o.pickupLocation)}
                  </Text>
                  <Text selectable style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>
                    ● DEST: {formatLatLng(o.dropoffLocation)}
                  </Text>
                </Pressable>

                {showAcceptReject ? (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => rejectOrder(o.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 14,
                        borderCurve: 'continuous',
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.text }}>
                        REJECT
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => acceptOrder(o.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 14,
                        borderCurve: 'continuous',
                        backgroundColor: colors.primary,
                      }}
                    >
                      <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.primaryText }}>
                        ACCEPT
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {showPicked ? (
                  <Pressable
                    onPress={() => markPicked(o.id)}
                    style={{
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderCurve: 'continuous',
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.primaryText }}>
                      MARK PICKED UP
                    </Text>
                  </Pressable>
                ) : null}

                {showDelivered ? (
                  <Pressable
                    onPress={() => markDelivered(o.id)}
                    style={{
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderCurve: 'continuous',
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.primaryText }}>
                      MARK DELIVERED
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.primary,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              TODAY'S SHIFT
            </Text>
            <Text selectable style={{ color: '#22C55E', fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] }}>
              $
              {orders
                .filter((o) => o.status === 'delivered')
                .reduce((sum, o) => sum + (o.price ?? 0), 0)
                .toFixed(2)}
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              DELIVERIES
            </Text>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] }}>
              {orders.filter((o) => o.status === 'delivered').length}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              MILES
            </Text>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] }}>
              48.2
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              RATING
            </Text>
            <Text selectable style={{ color: '#22C55E', fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] }}>
              4.9
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
