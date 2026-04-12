import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useSuperAdminData } from '@/src/super/use-super-admin';
import { useAppTheme } from '@/src/theme/theme';

type AdminRow = { name: string; email: string; tenantId: string; status: 'active' | 'suspended' };
type AuditRow = { title: string; subtitle: string; age: string; color: string };

function statusChip(status: AdminRow['status']) {
  if (status === 'active') return { bg: '#D7F5DF', fg: '#0B5A2A', label: 'ACTIVE' };
  return { bg: '#FDE7C3', fg: '#7A4B00', label: 'SUSPENDED' };
}

export default function SuperAdminHealth() {
  const { colors } = useAppTheme();
  const { admins, audit } = useSuperAdminData();

  const activeTenants = admins.filter((a) => (a.status ?? 'active') === 'active').length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 22 }}
    >
      <View style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          SYSTEM UPTIME
        </Text>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] }}>
          99.9%
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          All systems operational
        </Text>
      </View>

      <View style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          ACTIVE TENANTS
        </Text>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] }}>
          {activeTenants}
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          Live
        </Text>
      </View>

      <View style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 6 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
          TOTAL VOLUME
        </Text>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 34, fontVariant: ['tabular-nums'] }}>
          $2.4M
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          Real-time processing active
        </Text>
      </View>

      <View style={{ paddingTop: 6, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ gap: 2 }}>
            <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
              System{'\n'}Administrators
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/(admin)/(super)/admins')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderCurve: 'continuous',
              backgroundColor: colors.secondary,
            }}
          >
            <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
              Add Admin
            </Text>
          </Pressable>
        </View>

        <View style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              ADMINISTRATOR
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              TENANT ID
            </Text>
            <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 11 }}>
              STATUS
            </Text>
          </View>

          {admins.slice(0, 3).map((a) => {
            const chip = statusChip((a.status ?? 'active') as any);
            return (
              <Pressable
                key={a.id}
                onPress={() => router.push('/(app)/(admin)/(super)/admins')}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View style={{ gap: 2, flex: 1 }}>
                  <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                    {a.email ?? a.id}
                  </Text>
                  <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                    {a.id}
                  </Text>
                </View>
                <Text selectable style={{ width: 74, color: colors.mutedText, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                  {a.adminId ?? a.id}
                </Text>
                <View style={{ width: 86, alignItems: 'flex-end' }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: chip.bg }}>
                    <Text selectable style={{ color: chip.fg, fontWeight: '900', fontSize: 12 }}>
                      {chip.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingTop: 6, gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
          Audit Logs
        </Text>

        <View style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
          {audit.slice(0, 8).map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 3, borderRadius: 999, backgroundColor: '#3B82F6' }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {a.type}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  {a.details ? JSON.stringify(a.details) : ''}
                </Text>
              </View>
            </View>
          ))}

          <Pressable
            style={{
              marginTop: 6,
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text selectable style={{ textAlign: 'center', fontWeight: '900', color: colors.text }}>
              View Detailed Audit Log →
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
