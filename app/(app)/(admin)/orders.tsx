import { useLocalSearchParams } from 'expo-router';
import { GeoPoint, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AdminMap } from '@/components/admin-map';
import { useAdminData } from '@/src/admin/use-admin-data';
import { firestore, functionsClient } from '@/src/firebase/client';
import { transitionOrder } from '@/src/orders/transition';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

function parseLatLng(text: string) {
  const parts = text
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function formatLatLng(value: any) {
  const lat = value?.latitude ?? value?._lat ?? null;
  const lng = value?.longitude ?? value?._long ?? null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function toLatLngText(value: any) {
  const lat = value?.latitude ?? value?._lat ?? null;
  const lng = value?.longitude ?? value?._long ?? null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return '';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function statusChip(status: string) {
  if (status === 'pending') return { label: 'PENDING', bg: '#FDE7C3', fg: '#7A4B00' };
  if (status === 'assigned' || status === 'accepted' || status === 'picked') return { label: 'IN_TRANSIT', bg: '#DDE8FF', fg: '#1D3C91' };
  if (status === 'delivered') return { label: 'DELIVERED', bg: '#D7F5DF', fg: '#0B5A2A' };
  return { label: status.toUpperCase(), bg: 'rgba(0,0,0,0.08)', fg: 'rgba(0,0,0,0.7)' };
}

export default function AdminOrders() {
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? null;
  const { drivers, orders } = useAdminData({ adminId });
  const { focus } = useLocalSearchParams<{ focus?: string }>();

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [orderUserId, setOrderUserId] = React.useState('');
  const [pickupLatLng, setPickupLatLng] = React.useState('');
  const [dropoffLatLng, setDropoffLatLng] = React.useState('');
  const [price, setPrice] = React.useState('0.00');
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'prepaid'>('cash');
  const [busy, setBusy] = React.useState(false);

  const [editPickupLatLng, setEditPickupLatLng] = React.useState('');
  const [editDropoffLatLng, setEditDropoffLatLng] = React.useState('');
  const [editPrice, setEditPrice] = React.useState('0.00');
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<'cash' | 'prepaid'>('cash');

  React.useEffect(() => {
    if (typeof focus !== 'string' || !focus) return;
    setSelectedOrderId(focus);
  }, [focus]);

  const activeOrders = React.useMemo(
    () => orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled'),
    [orders]
  );

  const selectedOrder = React.useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  React.useEffect(() => {
    if (!selectedOrder) return;
    setEditPickupLatLng(toLatLngText(selectedOrder.pickupLocation));
    setEditDropoffLatLng(toLatLngText(selectedOrder.dropoffLocation));
    setEditPrice(String(Number.isFinite(selectedOrder.price as any) ? selectedOrder.price : 0));
    setEditPaymentMethod((selectedOrder.paymentMethod ?? 'cash') as 'cash' | 'prepaid');
  }, [selectedOrder?.id, selectedOrder?.pickupLocation, selectedOrder?.dropoffLocation, selectedOrder?.price, selectedOrder?.paymentMethod]);

  const selectedPickup = selectedOrder?.pickupLocation
    ? {
      latitude: selectedOrder.pickupLocation.latitude ?? selectedOrder.pickupLocation._lat,
      longitude: selectedOrder.pickupLocation.longitude ?? selectedOrder.pickupLocation._long,
    }
    : null;

  const selectedDropoff = selectedOrder?.dropoffLocation
    ? {
      latitude: selectedOrder.dropoffLocation.latitude ?? selectedOrder.dropoffLocation._lat,
      longitude: selectedOrder.dropoffLocation.longitude ?? selectedOrder.dropoffLocation._long,
    }
    : null;

  const driverMarkers = React.useMemo(() => {
    return drivers
      .map((d) => {
        const loc = d.currentLocation;
        const latitude = loc?.latitude ?? loc?._lat ?? null;
        const longitude = loc?.longitude ?? loc?._long ?? null;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
        return { id: d.id, location: { latitude, longitude } };
      })
      .filter((v): v is { id: string; location: { latitude: number; longitude: number } } => v !== null);
  }, [drivers]);

  async function createOrder() {
    const uid = user?.uid ?? null;
    if (!adminId || !uid) return;

    const pickup = parseLatLng(pickupLatLng);
    const dropoff = parseLatLng(dropoffLatLng);
    const p = Number(price);

    if (!pickup || !dropoff) {
      Alert.alert('Invalid coordinates', 'Use "lat, lng" format for pickup and dropoff.');
      return;
    }

    setBusy(true);
    try {
      await addDoc(collection(firestore, 'orders'), {
        userId: orderUserId.trim() || uid,
        adminId,
        pickupLocation: new GeoPoint(pickup.lat, pickup.lng),
        dropoffLocation: new GeoPoint(dropoff.lat, dropoff.lng),
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
      setPickupLatLng('');
      setDropoffLatLng('');
      setOrderUserId('');
    } catch (e: any) {
      Alert.alert('Create failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function assignFirstIdle(orderId: string) {
    const candidate = drivers.find((d) => d.isOnline && d.status === 'idle');
    if (!candidate) {
      Alert.alert('No idle drivers', 'Ask a driver to go online.');
      return;
    }
    try {
      await transitionOrder({ action: 'admin_assign', orderId, driverId: candidate.id });
    } catch (e: any) {
      Alert.alert('Assignment failed', e?.message ?? 'Unknown error');
    }
  }

  async function reassignFirstIdle(orderId: string, currentDriverId?: string) {
    const candidate = drivers.find((d) => d.isOnline && d.status === 'idle' && d.id !== currentDriverId);
    if (!candidate) {
      Alert.alert('No idle drivers', 'Ask a driver to go online.');
      return;
    }
    try {
      await transitionOrder({ action: 'admin_reassign', orderId, driverId: candidate.id });
    } catch (e: any) {
      Alert.alert('Reassign failed', e?.message ?? 'Unknown error');
    }
  }

  async function updateSelectedOrder() {
    if (!selectedOrder) return;
    if (selectedOrder.status !== 'pending') {
      Alert.alert('Not editable', 'Only pending orders can be edited.');
      return;
    }

    const pickup = parseLatLng(editPickupLatLng);
    const dropoff = parseLatLng(editDropoffLatLng);
    const p = Number(editPrice);
    if (!pickup || !dropoff) {
      Alert.alert('Invalid coordinates', 'Use "lat, lng" format for pickup and dropoff.');
      return;
    }
    if (!Number.isFinite(p)) {
      Alert.alert('Invalid price', 'Enter a valid number.');
      return;
    }

    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminUpdateOrder');
      await fn({
        orderId: selectedOrder.id,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        price: p,
        paymentMethod: editPaymentMethod,
      });
      Alert.alert('Updated', 'Order updated successfully.');
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedOrder() {
    if (!selectedOrder) return;
    if (selectedOrder.status !== 'pending') {
      Alert.alert('Not deletable', 'Only pending orders can be deleted.');
      return;
    }
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminDeleteOrder');
      await fn({ orderId: selectedOrder.id });
      setSelectedOrderId(null);
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function cancelSelectedMission() {
    if (!selectedOrder) return;
    if (selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled') return;
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminCancelMission');
      await fn({ orderId: selectedOrder.id });
    } catch (e: any) {
      Alert.alert('Cancel failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 10 }}>
        <View
          style={{
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: colors.card,
            padding: 16,
            gap: 10,
          }}
        >
          <Text selectable style={{ fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            ＋  CREATE PENDING ORDER
          </Text>

          <View style={{ gap: 6 }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
              USER ID (OPTIONAL)
            </Text>
            <TextInput
              value={orderUserId}
              onChangeText={setOrderUserId}
              placeholder="UID-0000"
              placeholderTextColor={colors.mutedText}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: colors.background,
                borderRadius: 14,
                borderCurve: 'continuous',
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontWeight: '800',
                letterSpacing: 1,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                PICKUP LAT/LNG
              </Text>
              <TextInput
                value={pickupLatLng}
                onChangeText={setPickupLatLng}
                placeholder="40.7128, -74.0060"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                DROPOFF LAT/LNG
              </Text>
              <TextInput
                value={dropoffLatLng}
                onChangeText={setDropoffLatLng}
                placeholder="40.7306, -73.9352"
                placeholderTextColor={colors.mutedText}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                PRICE ($)
              </Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.mutedText}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>

            <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
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
                      opacity: !selected && m === 'prepaid' ? 0.6 : 1,
                    }}
                  >
                    <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: selected ? colors.primaryText : colors.mutedText }}>
                      {m.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            disabled={busy}
            onPress={createOrder}
            style={{
              marginTop: 6,
              paddingVertical: 16,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: busy ? colors.disabled : colors.primary,
            }}
          >
            <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.primaryText }}>
              CREATE PENDING ORDER
            </Text>
          </Pressable>
        </View>

        {selectedOrder ? (
          <View
            style={{
              borderRadius: 18,
              borderCurve: 'continuous',
              backgroundColor: colors.card,
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
                  ORDER CONTROL
                </Text>
                <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
                  {selectedOrder.id.toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedOrderId(null)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderCurve: 'continuous',
                  backgroundColor: colors.secondary,
                }}
              >
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  Clear
                </Text>
              </Pressable>
            </View>

            <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
              Status: {selectedOrder.status.toUpperCase()}
            </Text>

            <View style={{ gap: 6 }}>
              <Text selectable style={{ color: colors.text }}>
                ○  {formatLatLng(selectedOrder.pickupLocation)}
              </Text>
              <Text selectable style={{ color: colors.text }}>
                ⦿  {formatLatLng(selectedOrder.dropoffLocation)}
              </Text>
            </View>

            {selectedOrder.status === 'pending' ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                      PICKUP LAT/LNG
                    </Text>
                    <TextInput
                      value={editPickupLatLng}
                      onChangeText={setEditPickupLatLng}
                      placeholder="40.7128, -74.0060"
                      placeholderTextColor={colors.mutedText}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 14,
                        borderCurve: 'continuous',
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        color: colors.text,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                      DROPOFF LAT/LNG
                    </Text>
                    <TextInput
                      value={editDropoffLatLng}
                      onChangeText={setEditDropoffLatLng}
                      placeholder="40.7306, -73.9352"
                      placeholderTextColor={colors.mutedText}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 14,
                        borderCurve: 'continuous',
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        color: colors.text,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
                      PRICE ($)
                    </Text>
                    <TextInput
                      value={editPrice}
                      onChangeText={setEditPrice}
                      placeholder="0.00"
                      placeholderTextColor={colors.mutedText}
                      keyboardType="decimal-pad"
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 14,
                        borderCurve: 'continuous',
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        color: colors.text,
                        fontWeight: '800',
                        fontVariant: ['tabular-nums'],
                      }}
                    />
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                    {(['cash', 'prepaid'] as const).map((m) => {
                      const selected = m === editPaymentMethod;
                      return (
                        <Pressable
                          key={m}
                          onPress={() => setEditPaymentMethod(m)}
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
                          <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: selected ? colors.primaryText : colors.mutedText }}>
                            {m.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={updateSelectedOrder}
                  style={{
                    paddingVertical: 14,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    backgroundColor: busy ? colors.disabled : colors.primary,
                  }}
                >
                  <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
                    UPDATE ORDER
                  </Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    Alert.alert('Delete order?', 'Only pending orders can be deleted.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: deleteSelectedOrder },
                    ])
                  }
                  style={{
                    paddingVertical: 14,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
                    DELETE ORDER
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                disabled={busy || selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled'}
                onPress={() =>
                  Alert.alert('Cancel mission?', 'This will cancel the active delivery and free the driver.', [
                    { text: 'Keep', style: 'cancel' },
                    { text: 'Cancel mission', style: 'destructive', onPress: cancelSelectedMission },
                  ])
                }
                style={{
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  backgroundColor:
                    selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled' ? colors.disabled : colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
                  CANCEL MISSION
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <Text selectable style={{ fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            ACTIVE MANIFEST
          </Text>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primary }}>
            <Text selectable style={{ color: colors.primaryText, fontWeight: '900' }}>
              {activeOrders.length} ACTIVE
            </Text>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {activeOrders.map((o) => {
            const chip = statusChip(o.status);
            const paymentLabel = `${(o.price ?? 0).toFixed(2)} ${(o.paymentMethod ?? 'cash').toUpperCase()}`;
            return (
              <View
                key={o.id}
                style={{
                  borderRadius: 18,
                  borderCurve: 'continuous',
                  backgroundColor: colors.card,
                  padding: 14,
                  gap: 10,
                }}
              >
                <Pressable onPress={() => setSelectedOrderId(o.id)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>
                      {o.id.toUpperCase()}
                    </Text>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: chip.bg }}>
                      <Text selectable style={{ fontWeight: '900', color: chip.fg, letterSpacing: 0.5 }}>
                        {chip.label}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <View style={{ gap: 6 }}>
                  <Text selectable style={{ color: colors.text }}>
                    ○  {formatLatLng(o.pickupLocation)}
                  </Text>
                  <Text selectable style={{ color: colors.text }}>
                    ⦿  {formatLatLng(o.dropoffLocation)}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
                    DRIVER: {o.driverId ? o.driverId : '—'}
                  </Text>
                  <Text selectable style={{ color: colors.text, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                    ${paymentLabel}
                  </Text>
                </View>

                {o.status === 'pending' ? (
                  <Pressable
                    onPress={() => assignFirstIdle(o.id)}
                    style={{
                      paddingVertical: 14,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
                      ASSIGN FIRST IDLE DRIVER
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => reassignFirstIdle(o.id, o.driverId)}
                    style={{
                      paddingVertical: 14,
                      borderRadius: 16,
                      borderCurve: 'continuous',
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
                      REASSIGN
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ height: 160, borderTopWidth: 1, borderTopColor: colors.border }}>
        <AdminMap drivers={driverMarkers} pickup={selectedPickup} dropoff={selectedDropoff} />
        <View
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderCurve: 'continuous',
            backgroundColor: colors.card,
          }}
        >
          <Text selectable style={{ fontWeight: '900', color: colors.mutedText, letterSpacing: 1 }}>
            SYSTEM LOAD
          </Text>
        </View>
      </View>
    </View>
  );
}
