import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GeoPoint, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { firestore } from '@/src/firebase/client';
import { transitionOrder } from '@/src/orders/transition';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';
import { useUserOrders } from '@/src/user/use-user-orders';

function statusStyle(status: string) {
  if (status === 'assigned' || status === 'accepted' || status === 'picked') return { label: 'IN TRANSIT', stripe: '#22C55E' };
  if (status === 'pending') return { label: 'ASSIGNING', stripe: '#F59E0B' };
  if (status === 'delivered') return { label: 'DELIVERED', stripe: 'rgba(0,0,0,0.25)' };
  return { label: status.toUpperCase(), stripe: 'rgba(0,0,0,0.25)' };
}

function formatPickup(v: { lat: number; lng: number } | null) {
  if (!v) return '—';
  return `${v.lat.toFixed(4)}° N, ${v.lng.toFixed(4)}° W`;
}

export default function UserHome() {
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid;

  const [adminId, setAdminId] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'prepaid'>('cash');
  const [price, setPrice] = React.useState('12');
  const [pickup, setPickup] = React.useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLat, setDropoffLat] = React.useState('');
  const [dropoffLng, setDropoffLng] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const { orders } = useUserOrders({ uid });

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

  async function cancelOrder(orderId: string) {
    setBusy(true);
    try {
      await transitionOrder({ action: 'user_cancel', orderId });
    } catch (e: any) {
      Alert.alert('Cancel failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  const activeCount = orders.filter((o) => o.status === 'assigned' || o.status === 'accepted' || o.status === 'picked').length;
  const activeForFeed = orders.find((o) => o.status === 'assigned' || o.status === 'accepted' || o.status === 'picked') ?? null;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 20 }}
    >
      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          padding: 16,
          gap: 12,
        }}
      >
        <Text selectable style={{ color: colors.text, fontWeight: '900', letterSpacing: 0.5 }}>
          I CREATE ORDER
        </Text>

        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
            TENANT ADMIN ID
          </Text>
          <TextInput
            value={adminId}
            onChangeText={setAdminId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="T-882-991"
            placeholderTextColor={colors.mutedText}
            style={{
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              color: colors.text,
              fontWeight: '800',
              letterSpacing: 1,
            }}
          />
        </View>

        <Pressable
          onPress={capturePickup}
          style={{
            paddingVertical: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            PICKUP COORDINATES
          </Text>
        </Pressable>

        <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          ○ {formatPickup(pickup)}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
              DROPOFF LAT
            </Text>
            <TextInput
              value={dropoffLat}
              onChangeText={setDropoffLat}
              placeholder="00.0000"
              placeholderTextColor={colors.mutedText}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                borderRadius: 14,
                borderCurve: 'continuous',
                color: colors.text,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
              DROPOFF LONG
            </Text>
            <TextInput
              value={dropoffLng}
              onChangeText={setDropoffLng}
              placeholder="00.0000"
              placeholderTextColor={colors.mutedText}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                borderRadius: 14,
                borderCurve: 'continuous',
                color: colors.text,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}
            />
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
            PRICE (USD)
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="$ 0.00"
            placeholderTextColor={colors.mutedText}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              color: colors.text,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
            }}
          />
        </View>

        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
          PAYMENT METHOD
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['cash', 'prepaid'] as const).map((m) => {
            const selected = m === paymentMethod;
            return (
              <Pressable
                key={m}
                onPress={() => setPaymentMethod(m)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: selected ? colors.primaryText : colors.text }}>
                  {m.toUpperCase()}
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
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: busy ? colors.disabled : colors.primary,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
            CREATE ORDER
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900', letterSpacing: 0.5 }}>
          I MY ORDERS
        </Text>
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.secondary }}>
          <Text selectable style={{ color: colors.text, fontWeight: '900', letterSpacing: 0.5, fontSize: 12 }}>
            LIVE TRACKING: {activeCount} ACTIVE
          </Text>
        </View>
      </View>

      {orders.length === 0 ? <Text selectable style={{ color: colors.mutedText }}>No orders yet.</Text> : null}

      <View style={{ gap: 12 }}>
        {orders.slice(0, 8).map((o) => {
          const s = statusStyle(o.status);
          const showViewMap = o.status === 'assigned' || o.status === 'accepted' || o.status === 'picked';
          const showCancel = o.status === 'pending';
          const showReceipt = o.status === 'delivered';
          return (
            <View
              key={o.id}
              style={{
                borderRadius: 18,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
                overflow: 'hidden',
              }}
            >
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: s.stripe }} />
              <View style={{ padding: 14, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.secondary }}>
                        <Text selectable style={{ fontWeight: '900', color: colors.text, fontSize: 12 }}>
                          {s.label}
                        </Text>
                      </View>
                      <Text selectable style={{ color: colors.mutedText, fontWeight: '900', fontSize: 12 }}>
                        {o.id.toUpperCase()}
                      </Text>
                    </View>
                    <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                      ORDER #{o.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                      DRIVER ID: {o.driverId ? o.driverId : 'SEARCHING...'}
                    </Text>
                  </View>
                </View>

                {showViewMap ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text selectable style={{ color: colors.mutedText, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                      DRIVER: {o.driverId ? o.driverId.slice(0, 8).toUpperCase() : 'SEARCHING...'}
                    </Text>
                    <Pressable
                      onPress={() => router.push(`/(app)/(user)/orders/${o.id}`)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        borderCurve: 'continuous',
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                        VIEW MAP
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {showReceipt ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text selectable style={{ color: colors.mutedText, fontWeight: '900' }}>
                      PAYMENT: {(o as any).paymentMethod?.toUpperCase() ?? '—'}
                    </Text>
                    <Pressable
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        borderCurve: 'continuous',
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                        opacity: 0.7,
                      }}
                    >
                      <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                        RECEIPT
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {showCancel ? (
                  <Pressable
                    disabled={busy}
                    onPress={() => cancelOrder(o.id)}
                    style={{
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderCurve: 'continuous',
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.text }}>
                      CANCEL
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View
        style={{
          borderRadius: 18,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: colors.card,
          height: 160,
        }}
      >
        <Pressable
          onPress={() => {
            if (activeForFeed) router.push(`/(app)/(user)/orders/${activeForFeed.id}`);
          }}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: colors.card }} />
          <View
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderCurve: 'continuous',
              backgroundColor: colors.primary,
            }}
          >
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              LIVE FEED_01
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 12,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: colors.background,
              padding: 12,
            }}
          >
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              CURRENT ACTIVE ROUTE
            </Text>
            <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
              {activeForFeed ? `ORDER #${activeForFeed.id.slice(0, 8).toUpperCase()} IN TRANSIT` : 'NO ACTIVE ORDERS'}
            </Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}
