import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ThemeToggle } from '@/components/ThemeToggle';
import { firebaseAuth } from '@/src/firebase/client';
import { useRtdbNotifications } from '@/src/notifications/use-rtdb-notifications';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

export default function AdminProfile() {
  const { colors } = useAppTheme();
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? '—';
  const { items } = useRtdbNotifications({ uid: profile?.id ?? null, limit: 10 });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <View
        style={{
          padding: 16,
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          gap: 8,
        }}
      >
        <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>
          ADMIN PROFILE
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontVariant: ['tabular-nums'] }}>
          Tenant ID: {adminId}
        </Text>
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          gap: 12,
        }}
      >
        <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>
          APPEARANCE
        </Text>
        <ThemeToggle />
      </View>

      <Pressable
        onPress={() => router.push('/(app)/(admin)/(super)/health')}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: colors.secondary,
        }}
      >
        <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
          OPEN MASTER CONSOLE
        </Text>
      </Pressable>

      <View
        style={{
          padding: 16,
          borderRadius: 18,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          gap: 12,
        }}
      >
        <Text selectable style={{ fontWeight: '900', color: colors.text, letterSpacing: 0.5 }}>
          NOTIFICATIONS
        </Text>
        {items.length === 0 ? (
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
            No notifications yet.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {items.slice(0, 6).map((n) => (
              <View key={n.id} style={{ padding: 12, borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.background, gap: 4 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {n.title ?? n.type ?? 'Notification'}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
                  {n.body ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Pressable
        onPress={() => signOut(firebaseAuth)}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderRadius: 16,
          borderCurve: 'continuous',
          backgroundColor: colors.primary,
        }}
      >
        <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
          SIGN OUT
        </Text>
      </Pressable>
    </ScrollView>
  );
}
