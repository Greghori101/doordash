import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { sendEmailSignInLink } from '@/src/auth/email-link-auth';
import { signInWithApple } from '@/src/auth/social-auth';
import { firebaseAuth } from '@/src/firebase/client';
import { useAuthStore } from '@/src/store/auth-store';
import { useAppTheme } from '@/src/theme/theme';

WebBrowser.maybeCompleteAuthSession();

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

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  // Use platform client ID if available, fall back to web client ID for OAuth web flow
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: androidClientId ?? webClientId ?? 'not-configured',
    iosClientId: iosClientId ?? webClientId ?? 'not-configured',
    webClientId,
  });

  const googleConfigured =
    Platform.OS === 'web'
      ? !!webClientId
      : !!(androidClientId ?? iosClientId ?? webClientId);

  // Handle Google OAuth response
  React.useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken =
        googleResponse.params?.id_token ??
        googleResponse.authentication?.idToken ??
        null;
      const accessToken = googleResponse.authentication?.accessToken ?? null;
      if (idToken || accessToken) {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        signInWithCredential(firebaseAuth, credential).catch((e: any) =>
          Alert.alert('Google sign-in failed', e?.message ?? 'Unknown error')
        );
      } else {
        Alert.alert('Google sign-in', 'No credentials received. Try again.');
      }
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google sign-in', googleResponse.error?.message ?? 'Sign-in failed');
    }
  }, [googleResponse]);

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
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await sendEmailSignInLink(normalizedEmail);
      router.push({ pathname: '/(auth)/verify-email', params: { email: normalizedEmail } });
    } catch (e: any) {
      Alert.alert('Could not send link', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSignIn() {
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

  async function handleAppleSignIn() {
    setBusy(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple sign-in', e?.message ?? 'Sign-in failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!googleConfigured) {
      Alert.alert('Google sign-in', 'Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID / IOS_CLIENT_ID in .env to enable Google sign-in.');
      return;
    }
    if (Platform.OS === 'web') {
      setBusy(true);
      try {
        const { signInWithGoogleWeb } = await import('@/src/auth/social-auth');
        await signInWithGoogleWeb();
      } catch (e: any) {
        Alert.alert('Google sign-in', e?.message ?? 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    } else {
      promptGoogleAsync();
    }
  }

  const showApple = Platform.OS === 'ios' || Platform.OS === 'web';

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
        {showApple ? (
          <Pressable
            onPress={handleAppleSignIn}
            disabled={busy}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              borderWidth: 2,
              borderColor: colors.text,
            }}
          >
            <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.text }}>
               CONTINUE WITH APPLE
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={busy}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 12,
            borderRadius: 14,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: colors.text,
            opacity: googleConfigured ? 1 : 0.45,
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
                  {k === 'otp' ? 'EMAIL CODE' : 'PASSWORD'}
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
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedText}
            style={{
              backgroundColor: colors.card,
              padding: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              color: colors.text,
              fontWeight: '700',
            }}
          />
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
                  fontWeight: '700',
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

      <View style={{ alignItems: 'center', paddingTop: 4, gap: 8 }}>
        <Pressable onPress={() => router.push('/(auth)/sign-up')} style={{ paddingTop: 8 }}>
          <Text selectable style={{ color: colors.text, fontWeight: '800' }}>
            Create account
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
