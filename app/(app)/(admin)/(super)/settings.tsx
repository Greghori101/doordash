import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppTheme } from '@/src/theme/theme';

export default function SuperAdminSettings() {
  const { colors } = useAppTheme();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          SETTINGS
        </Text>
        <ThemeToggle />
      </View>
    </ScrollView>
  );
}

