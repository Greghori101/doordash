import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAdminData } from '@/src/admin/use-admin-data';
import { transitionOrder } from '@/src/orders/transition';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

type OrderFilter = 'pending' | 'active' | 'history';

export default function AdminDashboard() {
  const { colors } = useAppTheme();
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? null;
  const { drivers, orders } = useAdminData({ adminId });
  const [filter, setFilter] = React.useState<OrderFilter>('pending');

  const pendingOrders = React.useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const activeOrders = React.useMemo(() => orders.filter((o) => o.status === 'assigned' || o.status === 'accepted' || o.status === 'picked'), [orders]);
  const historyOrders = React.useMemo(() => orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled'), [orders]);
  const shownOrders = filter === 'pending' ? pendingOrders : filter === 'active' ? activeOrders : historyOrders;

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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            TOTAL DRIVERS
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] }}>
            {drivers.length}
          </Text>
        </View>
        <View style={{ flex: 1, padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
            ACTIVE ORDERS
          </Text>
          <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] }}>
            {activeOrders.length}
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
            Live
          </Text>
        </View>
      </View>

      <View style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          SYSTEM HEALTH
        </Text>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] }}>
          99.8
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          All systems operational
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 18 }}>
              Fleet{'\n'}Management
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '700' }}>
              Real-time driver tracking and dispatch
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/(admin)/drivers')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderCurve: 'continuous',
              backgroundColor: colors.secondary,
            }}
          >
            <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
              Add Driver
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {drivers.slice(0, 3).map((d) => {
            const online = d.isOnline;
            const chipBg = online ? '#D7F5DF' : '#F0F0F0';
            const chipFg = online ? '#0B5A2A' : 'rgba(0,0,0,0.6)';
            return (
              <View
                key={d.id}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  borderCurve: 'continuous',
                  backgroundColor: colors.card,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                    {d.id}
                  </Text>
                  <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                    {online ? 'Online' : 'Offline'} · {d.status}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: chipBg }}>
                    <Text selectable style={{ color: chipFg, fontWeight: '900', fontSize: 12 }}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push({ pathname: '/(app)/(admin)/drivers/[id]', params: { id: d.id } })}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderCurve: 'continuous',
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                      Manage
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['pending', 'active', 'history'] as const).map((k) => {
            const selected = k === filter;
            return (
              <Pressable
                key={k}
                onPress={() => setFilter(k)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? colors.primary : colors.secondary,
                }}
              >
                <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: selected ? colors.primaryText : colors.text }}>
                  {k[0].toUpperCase() + k.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 12 }}>
          {shownOrders.slice(0, 6).map((o) => (
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {o.id}
                </Text>
                <Pressable
                  onPress={() => router.push({ pathname: '/(app)/(admin)/orders', params: { focus: o.id } })}
                  style={{
                    padding: 10,
                    borderRadius: 999,
                    borderCurve: 'continuous',
                    backgroundColor: colors.secondary,
                  }}
                >
                  <FontAwesome name="arrow-right" size={14} color={colors.text} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable
                  disabled={o.status !== 'pending'}
                  onPress={() => assignFirstIdle(o.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 999,
                    borderCurve: 'continuous',
                    backgroundColor: o.status === 'pending' ? colors.primary : colors.disabled,
                    marginRight: 10,
                  }}
                >
                  <Text selectable style={{ textAlign: 'center', color: colors.primaryText, fontWeight: '900' }}>
                    ASSIGN
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push({ pathname: '/(app)/(admin)/orders', params: { focus: o.id } })}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 999,
                    borderCurve: 'continuous',
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text selectable style={{ textAlign: 'center', color: colors.text, fontWeight: '900' }}>
                    DETAILS
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
