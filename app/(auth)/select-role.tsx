import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { setCurrentUserRole } from '@/src/auth/set-role';
import type { AppRole } from '@/src/auth/types';
import { useAppTheme } from '@/src/theme/theme';

export default function SelectRoleScreen() {
  const { colors } = useAppTheme();
  const [role, setRole] = React.useState<AppRole>('user');
  const [adminId, setAdminId] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function handleContinue() {
    setBusy(true);
    try {
      await setCurrentUserRole({ role, adminId: adminId.trim() || undefined });
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Could not save role', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Text selectable style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
        Choose how you want to use the app
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {(['user', 'driver', 'admin'] as const).map((r) => {
          const selected = r === role;
          return (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderCurve: 'continuous',
                backgroundColor: selected ? colors.primary : colors.secondary,
              }}
            >
              <Text
                selectable
                style={{ color: selected ? colors.primaryText : colors.text, fontWeight: '700', textTransform: 'capitalize' }}
              >
                {r}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {role === 'driver' ? (
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: colors.text }}>
            Admin ID
          </Text>
          <TextInput
            value={adminId}
            onChangeText={setAdminId}
            placeholder="Paste your adminId"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
              color: colors.text,
            }}
          />
        </View>
      ) : null}

      <Pressable
        disabled={busy}
        onPress={handleContinue}
        style={{
          padding: 14,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: busy ? colors.disabled : colors.primary,
        }}
      >
        <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '700' }}>
          Continue
        </Text>
      </Pressable>
    </ScrollView>
  );
}
