import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

export default function Index() {
  const { colors } = useAppTheme();
  const { user, role, profile, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome name="truck" size={20} color={colors.primaryText} />
          </View>
          <Text selectable style={{ fontSize: 40, fontWeight: '900', letterSpacing: -1, color: colors.text }}>
            DOORDROP
          </Text>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.text} />
            <Text selectable style={{ color: colors.mutedText, fontWeight: '800', letterSpacing: 2, fontSize: 12 }}>
              INITIALIZING LOGISTICS
            </Text>
          </View>
        </View>

        <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800', letterSpacing: 1, fontSize: 11 }}>
            SYSTEM VER 4.0.2 // PRECISION BRUTALISM
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800', letterSpacing: 1, fontSize: 11 }}>
            ●
          </Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile || !role) {
    return <Redirect href="/(auth)/select-role" />;
  }

  if (role !== 'super_admin' && profile.status === 'suspended') {
    return <Redirect href="/(auth)/account-disabled" />;
  }

  if (role === 'admin') {
    return <Redirect href="/(app)/(admin)" />;
  }

  if (role === 'super_admin') {
    return <Redirect href="/(app)/(admin)/(super)/health" />;
  }

  if (role === 'driver') {
    return <Redirect href="/(app)/(driver)" />;
  }

  return <Redirect href="/(app)/(user)" />;
}
