import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { requestEmailOtp } from '@/src/auth/email-otp-client';
import { signInWithAppleWeb, signInWithGoogleWeb } from '@/src/auth/federated-web';
import { firebaseAuth } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';
import { signInWithEmailAndPassword } from 'firebase/auth';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [mode, setMode] = React.useState<'otp' | 'password'>('otp');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (isBootstrapping) return;
    if (!user) return;
    router.replace('/');
  }, [isBootstrapping, user?.uid]);

  const normalizedEmail = email.trim();
  const canSubmit =
    !busy &&
    normalizedEmail.length > 0 &&
    isValidEmail(normalizedEmail) &&
    (mode === 'otp' ? true : password.length > 0);

  async function handleSendCode() {
    if (!normalizedEmail) {
      Alert.alert('Missing email', 'Enter your email address.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const result = await requestEmailOtp({ email: normalizedEmail });
      router.push({ pathname: '/(auth)/verify-email', params: { email: normalizedEmail, expiresAtMs: String(result.expiresAtMs) } });
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSignIn() {
    if (!normalizedEmail) {
      Alert.alert('Missing email', 'Enter your email address.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!password) {
      Alert.alert('Missing password', 'Enter your password.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.message ?? 'Unknown error');
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
            PRECISION LOGISTICS & FINAL MILE DELIVERY
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
        <Pressable
          onPress={() => signInWithAppleWeb().catch((e: any) => Alert.alert('Apple sign-in', e?.message ?? 'Not available.'))}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: colors.text,
            opacity: process.env.EXPO_OS === 'web' ? 1 : 0.55,
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.text }}>
              CONTINUE WITH APPLE
          </Text>
        </Pressable>

        <Pressable
          onPress={() => signInWithGoogleWeb().catch((e: any) => Alert.alert('Google sign-in', e?.message ?? 'Not available.'))}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: colors.text,
            opacity: process.env.EXPO_OS === 'web' ? 1 : 0.55,
          }}
        >
          <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            G  CONTINUE WITH GOOGLE
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
          <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
          <Text selectable style={{ fontWeight: '900', color: colors.mutedText }}>
            OR
          </Text>
          <View style={{ height: 1, flex: 1, backgroundColor: colors.border }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['otp', 'password'] as const).map((k) => {
            const selected = mode === k;
            return (
              <Pressable
                key={k}
                onPress={() => setMode(k)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? colors.primary : colors.card,
                }}
              >
                <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: selected ? colors.primaryText : colors.text }}>
                  {k === 'otp' ? 'EMAIL OTP' : 'EMAIL / PASS'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: 8 }}>
          <Text selectable style={{ fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            EMAIL ADDRESS
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
          <Text selectable style={{ color: colors.mutedText, fontWeight: '700', letterSpacing: 1, fontSize: 12 }}>
            {mode === 'otp' ? 'VERIFICATION REQUIRED' : 'LOGIN ONLY (NO SIGNUP)'}
          </Text>
        </View>

        {mode === 'password' ? (
          <View style={{ gap: 10 }}>
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
              onPress={handlePasswordSignIn}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 12,
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: canSubmit ? colors.primary : colors.disabled,
              }}
            >
              <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '700' }}>
                SIGN IN
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={!canSubmit}
            onPress={handleSendCode}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 12,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: canSubmit ? colors.primary : colors.disabled,
            }}
          >
            <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '700' }}>
              SEND VERIFICATION CODE
            </Text>
          </Pressable>
        )}
      </View>

      <View style={{ alignItems: 'center', paddingTop: 18, gap: 8 }}>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '700', letterSpacing: 2, fontSize: 12 }}>
          V.4.0.1_STABLE    SECURE_SERVER_09
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ width: 26, height: 3, borderRadius: 999, backgroundColor: colors.text, opacity: 0.3 }} />
          <View style={{ width: 26, height: 3, borderRadius: 999, backgroundColor: colors.text, opacity: 0.3 }} />
          <View style={{ width: 26, height: 3, borderRadius: 999, backgroundColor: '#F5A623' }} />
        </View>
        <Pressable onPress={() => router.push('/(auth)/sign-up')} style={{ paddingTop: 8 }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            Create account
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
