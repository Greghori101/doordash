import { Stack } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { ThemeToggle } from '@/components/ThemeToggle';
import { firebaseAuth } from '@/src/firebase/client';

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Driver',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingRight: 8 }}>
              <ThemeToggle />
              <Pressable onPress={() => signOut(firebaseAuth)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text selectable style={{ fontWeight: '700' }}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}
