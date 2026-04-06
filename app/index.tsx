import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/src/store/auth-store';

export default function Index() {
  const { user, role, profile, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile || !role) {
    return <Redirect href="/(auth)/select-role" />;
  }

  if (role === 'admin') {
    return <Redirect href="/(app)/(admin)" />;
  }

  if (role === 'driver') {
    return <Redirect href="/(app)/(driver)" />;
  }

  return <Redirect href="/(app)/(user)" />;
}

