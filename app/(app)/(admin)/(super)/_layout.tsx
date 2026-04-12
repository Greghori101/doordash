import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/theme';

export default function SuperAdminLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FontAwesome name="truck" size={16} color={colors.text} />
            <Text selectable style={{ fontWeight: '900', letterSpacing: 0.5, color: colors.text }}>
              DoorDrop
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 10 }}>
              // SUPER ADMIN // MASTER
            </Text>
          </View>
        ),
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarLabel: 'HEALTH',
          tabBarIcon: ({ color }) => <FontAwesome name="heartbeat" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admins"
        options={{
          title: 'Admins',
          tabBarLabel: 'ADMINS',
          tabBarIcon: ({ color }) => <FontAwesome name="users" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: 'Tenants',
          tabBarLabel: 'TENANTS',
          tabBarIcon: ({ color }) => <FontAwesome name="building" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'SETTINGS',
          tabBarIcon: ({ color }) => <FontAwesome name="cog" size={18} color={color} />,
        }}
      />
    </Tabs>
  );
}

