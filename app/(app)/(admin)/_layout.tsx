import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { firebaseAuth } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

export default function AdminLayout() {
  const { colors } = useAppTheme();
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? '—';

  return (
    <Tabs
      screenOptions={{
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FontAwesome name="truck" size={16} color={colors.text} />
            <Text selectable style={{ fontWeight: '900', letterSpacing: 0.5, color: colors.text }}>
              DOORDROP
            </Text>
          </View>
        ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderCurve: 'continuous',
                backgroundColor: colors.primary,
              }}
            >
              <Text selectable style={{ color: colors.primaryText, fontWeight: '900', letterSpacing: 0.5 }}>
                ADMIN // TENANT ID: {adminId}
              </Text>
            </View>
            <Pressable onPress={() => signOut(firebaseAuth)} style={{ padding: 10 }}>
              <FontAwesome name="sign-out" size={18} color={colors.text} />
            </Pressable>
          </View>
        ),
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <FontAwesome name="th-large" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color }) => <FontAwesome name="cube" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarLabel: 'Products',
          tabBarIcon: ({ color }) => <FontAwesome name="tag" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={18} color={color} />,
        }}
      />
      <Tabs.Screen name="drivers" options={{ href: null, title: 'Drivers' }} />
      <Tabs.Screen name="drivers/[id]" options={{ href: null, title: 'Driver' }} />
      <Tabs.Screen name="(super)" options={{ href: null }} />
    </Tabs>
  );
}
