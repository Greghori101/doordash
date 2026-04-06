import { Stack } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { signOut } from 'firebase/auth';

import { firebaseAuth } from '@/src/firebase/client';

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Driver',
          headerRight: () => (
            <Pressable onPress={() => signOut(firebaseAuth)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text selectable style={{ fontWeight: '700' }}>
                Sign out
              </Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

