import { httpsCallable } from 'firebase/functions';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { functionsClient } from '@/src/firebase/client';
import { useSuperAdminData } from '@/src/super/use-super-admin';
import { useAppTheme } from '@/src/theme/theme';

export default function SuperAdminAdmins() {
  const { colors } = useAppTheme();
  const { admins } = useSuperAdminData();
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function createAdmin() {
    const value = email.trim().toLowerCase();
    if (!value) return;
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'superAdminCreateAdmin');
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
      const fn = httpsCallable(functionsClient, 'superAdminSetUserStatus');
      await fn({ uid, status });
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAdmin(uid: string) {
    setBusy(true);
    try {
      const fn = httpsCallable(functionsClient, 'superAdminDeleteAdmin');
      await fn({ uid });
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
          ADMINS
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="admin@example.com"
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
          onPress={createAdmin}
          style={{
            paddingVertical: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            backgroundColor: busy ? colors.disabled : colors.primary,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
            ADD ADMIN
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: 10 }}>
        {admins.map((a) => {
          const status = (a.status ?? 'active') as 'active' | 'suspended';
          return (
            <View
              key={a.id}
              style={{
                padding: 14,
                borderRadius: 18,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
                gap: 10,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text selectable style={{ color: colors.text, fontWeight: '900' }}>
                  {a.email ?? '—'}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  uid: {a.id}
                </Text>
                <Text selectable style={{ color: colors.mutedText, fontWeight: '800', fontSize: 12 }}>
                  tenantId: {a.adminId ?? a.id}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  disabled={busy || status === 'active'}
                  onPress={() => setStatus(a.id, 'active')}
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
                  onPress={() => setStatus(a.id, 'suspended')}
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

              <Pressable
                disabled={busy}
                onPress={() =>
                  Alert.alert('Delete admin?', 'This will remove the admin account.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteAdmin(a.id) },
                  ])
                }
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: '#EF4444',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                <Text selectable style={{ color: '#EF4444', textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
                  DELETE ADMIN
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
