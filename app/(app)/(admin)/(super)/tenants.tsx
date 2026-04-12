import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/theme';
import { useSuperAdminData } from '@/src/super/use-super-admin';

export default function SuperAdminTenants() {
  const { colors } = useAppTheme();
  const { admins } = useSuperAdminData();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          TENANTS
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          {admins.length} tenants
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {admins.map((a) => (
          <View key={a.id} style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
            <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
              {a.adminId ?? a.id}
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
              admin: {a.email ?? '—'}
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
              status: {(a.status ?? 'active').toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
