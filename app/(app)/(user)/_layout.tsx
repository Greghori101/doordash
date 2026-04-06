import { Stack } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { signOut } from 'firebase/auth';

import { firebaseAuth } from '@/src/firebase/client';

export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'User',
          headerRight: () => (
            <Pressable onPress={() => signOut(firebaseAuth)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text selectable style={{ fontWeight: '700' }}>
                Sign out
              </Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
    </Stack>
  );
}

