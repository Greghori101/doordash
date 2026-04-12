import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';
import { useUserOrders } from '@/src/user/use-user-orders';

function statusStyle(status: string) {
  if (status === 'assigned' || status === 'accepted' || status === 'picked') return { label: 'IN TRANSIT', stripe: '#22C55E' };
  if (status === 'pending') return { label: 'ASSIGNING', stripe: '#F59E0B' };
  if (status === 'delivered') return { label: 'DELIVERED', stripe: 'rgba(0,0,0,0.25)' };
  return { label: status.toUpperCase(), stripe: 'rgba(0,0,0,0.25)' };
}

export default function UserOrders() {
  const { colors } = useAppTheme();
  const uid = useAuthStore((s) => s.user?.uid) ?? null;
  const { orders } = useUserOrders({ uid });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 1 }}>
        MY ORDERS
      </Text>

      {orders.length === 0 ? (
        <Text selectable style={{ color: colors.mutedText }}>
          No orders yet.
        </Text>
      ) : null}

      <View style={{ gap: 12 }}>
        {orders.map((o) => {
          const s = statusStyle(o.status);
          return (
            <Pressable
              key={o.id}
              onPress={() => router.push(`/(app)/(user)/orders/${o.id}`)}
              style={{
                borderRadius: 18,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
                overflow: 'hidden',
              }}
            >
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: s.stripe }} />
              <View style={{ padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                    {o.id.toUpperCase()}
                  </Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.secondary }}>
                    <Text selectable style={{ fontWeight: '900', color: colors.text, fontSize: 12 }}>
                      {s.label}
                    </Text>
                  </View>
                </View>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  DRIVER ID: {o.driverId ? o.driverId : 'SEARCHING...'}
                </Text>
                <Pressable
                  onPress={() => router.push(`/(app)/(user)/orders/${o.id}`)}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.text }}>
                    VIEW MAP
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
