import { router } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAdminData } from '@/src/admin/use-admin-data';
import { useAdminDriverUsers } from '@/src/admin/use-admin-drivers';
import { functionsClient } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

export default function AdminDrivers() {
  const { colors } = useAppTheme();
  const profile = useAuthStore((s) => s.profile);
  const adminId = profile?.adminId ?? null;
  const { drivers } = useAdminData({ adminId });
  const { driverUsers } = useAdminDriverUsers({ adminId });

  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const userById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const u of driverUsers) m.set(u.id, u);
    return m;
  }, [driverUsers]);

  async function createDriver() {
    const value = email.trim().toLowerCase();
    if (!value) return;
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminCreateDriver');
      await fn({ email: value });
      setEmail('');
    } catch (e: any) {
      Alert.alert('Create failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(uid: string, status: 'active' | 'suspended') {
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'adminSetDriverStatus');
      await fn({ uid, status });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          DRIVERS
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
          Tenant: {adminId ?? '—'}
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="driver@example.com"
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            borderRadius: 14,
            borderCurve: 'continuous',
            color: colors.text,
            fontWeight: '800',
          }}
        />

        <Pressable
          disabled={busy}
          onPress={createDriver}
          style={{
            paddingVertical: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: busy ? colors.disabled : colors.primary,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
            ADD DRIVER
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {drivers.map((d) => {
          const u = userById.get(d.id);
          const status = (u?.status ?? 'active') as 'active' | 'suspended';
          return (
            <View key={d.id} style={{ padding: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
              <Pressable onPress={() => router.push({ pathname: '/(app)/(admin)/drivers/[id]', params: { id: d.id } })} style={{ gap: 4 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {u?.email ?? d.id}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  {d.isOnline ? 'ONLINE' : 'OFFLINE'} · {d.status.toUpperCase()} · {(status ?? 'active').toUpperCase()}
                </Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  disabled={busy || status === 'active'}
                  onPress={() => setStatus(d.id, 'active')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    backgroundColor: status === 'active' ? colors.disabled : colors.primary,
                  }}
                >
                  <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900' }}>
                    ACTIVATE
                  </Text>
                </Pressable>
                <Pressable
                  disabled={busy || status === 'suspended'}
                  onPress={() => setStatus(d.id, 'suspended')}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    backgroundColor: status === 'suspended' ? colors.disabled : colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900' }}>
                    SUSPEND
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
