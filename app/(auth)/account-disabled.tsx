import FontAwesome from '@expo/vector-icons/FontAwesome';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { firebaseAuth } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

export default function AccountDisabledScreen() {
  const { colors } = useAppTheme();
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const status = profile?.status ?? 'suspended';

  const title = role === 'admin' ? 'AWAITING ACTIVATION' : 'ACCOUNT DISABLED';
  const subtitle =
    role === 'admin'
      ? 'A SUPER ADMIN MUST ACTIVATE YOUR ADMIN ACCOUNT BEFORE YOU CAN CONTINUE.'
      : 'YOUR ACCOUNT IS CURRENTLY SUSPENDED. CONTACT SUPPORT OR YOUR TENANT ADMIN.';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, gap: 18 }}
    >
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 44 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome name="lock" size={26} color={colors.primaryText} />
        </View>
        <Text selectable style={{ fontSize: 34, fontWeight: '900', letterSpacing: -1, color: colors.text, textAlign: 'center' }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800', letterSpacing: 1, textAlign: 'center' }}>
          {subtitle}
        </Text>
      </View>

      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          STATUS
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          role: {role ?? '—'}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          status: {status}
        </Text>
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
