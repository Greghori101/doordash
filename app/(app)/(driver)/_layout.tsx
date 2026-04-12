import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { firebaseAuth } from '@/src/firebase/client';
import { useAppTheme } from '@/src/theme/theme';

export default function DriverLayout() {
  const { colors } = useAppTheme();
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
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
              DRIVER MODE
            </Text>
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={18} color={color} />,
        }}
      />
      <Tabs.Screen name="orders/[id]" options={{ href: null, title: 'Order' }} />
    </Tabs>
  );
}
