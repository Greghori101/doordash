import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { setCurrentUserRole } from '@/src/auth/set-role';
import { firebaseAuth } from '@/src/firebase/client';
import { useAppTheme } from '@/src/theme/theme';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUpScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<'user' | 'admin'>('user');
  const [busy, setBusy] = React.useState(false);

  const normalizedEmail = email.trim();
  const canSubmit = !busy && isValidEmail(normalizedEmail) && password.length >= 6;

  async function handleSignUp() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      await setCurrentUserRole({ role });
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, gap: 18 }}
    >
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 44 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome name="truck" size={26} color={colors.primaryText} />
        </View>
        <Text selectable style={{ fontSize: 44, fontWeight: '900', letterSpacing: -1, color: colors.text }}>
          DOORDROP
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#7AC76B' }} />
          <Text selectable style={{ fontWeight: '700', color: colors.mutedText, letterSpacing: 1 }}>
            CREATE ACCOUNT
          </Text>
        </View>
      </View>

      <View
        style={{
          borderWidth: 2,
          borderColor: colors.text,
          borderRadius: 22,
          borderCurve: 'continuous',
          padding: 18,
          gap: 12,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['user', 'admin'] as const).map((k) => {
            const selected = role === k;
            return (
              <Pressable
                key={k}
                onPress={() => setRole(k)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? colors.primary : colors.card,
                }}
              >
                <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: selected ? colors.primaryText : colors.text }}>
                  {k === 'user' ? 'USER' : 'ADMIN'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Text selectable style={{ fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            EMAIL
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="LOGISTICS@DOORDROP.COM"
            placeholderTextColor={colors.mutedText}
            style={{
              backgroundColor: colors.card,
              padding: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              color: colors.text,
              fontWeight: '900',
              letterSpacing: 1,
            }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text selectable style={{ fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            PASSWORD
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedText}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: colors.card,
              padding: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              color: colors.text,
              fontWeight: '900',
              letterSpacing: 1,
            }}
          />
        </View>

        <Pressable
          disabled={!canSubmit}
          onPress={handleSignUp}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 12,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: canSubmit ? colors.primary : colors.disabled,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '700' }}>
            CREATE ACCOUNT
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(auth)/sign-in')}
          style={{ paddingVertical: 10, alignItems: 'center' }}
        >
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800' }}>
            Already have an account? Sign in
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
