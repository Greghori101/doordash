import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { signInWithCustomToken } from 'firebase/auth';

import { requestEmailOtp, verifyEmailOtp } from '@/src/auth/email-otp-client';
import { firebaseAuth } from '@/src/firebase/client';
import { useAppTheme } from '@/src/theme/theme';

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VerifyEmailScreen() {
  const { colors } = useAppTheme();
  const { email: emailParam, expiresAtMs: expiresAtParam } = useLocalSearchParams<{ email?: string; expiresAtMs?: string }>();
  const email = normalizeEmail(typeof emailParam === 'string' ? emailParam : '');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(
    typeof expiresAtParam === 'string' && Number.isFinite(Number(expiresAtParam)) ? Number(expiresAtParam) : null
  );
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;

  async function resend() {
    if (!email) return;
    setBusy(true);
    try {
      const result = await requestEmailOtp({ email });
      setExpiresAt(result.expiresAtMs);
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndContinue() {
    if (!email) return;
    const c = code.replace(/\D/g, '').slice(0, 6);
    if (c.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code.');
      return;
    }

    setBusy(true);
    try {
      const result = await verifyEmailOtp({ email, code: c });
      await signInWithCustomToken(firebaseAuth, result.customToken);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Verification failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 18, gap: 14 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome name="truck" size={18} color={colors.text} />
          <Text selectable style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
            DOORDROP
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={{ padding: 10 }}>
          <Text selectable style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
            ✕
          </Text>
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 22, gap: 10 }}>
        <Text selectable style={{ fontSize: 40, fontWeight: '900', letterSpacing: -1, color: colors.text }}>
          VERIFY EMAIL
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '700', letterSpacing: 1, textAlign: 'center' }}>
          ENTER THE 6-DIGIT CODE SENT TO YOUR{'\n'}EMAIL.
        </Text>
      </View>

      <View
        style={{
          marginTop: 18,
          borderRadius: 22,
          borderCurve: 'continuous',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const v = code.replace(/\D/g, '').padEnd(6, ' ')[i] ?? ' ';
            return (
              <View
                key={i}
                style={{
                  width: 44,
                  height: 56,
                  borderRadius: 14,
                  borderCurve: 'continuous',
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text selectable style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>
                  {v === ' ' ? '•' : v}
                </Text>
              </View>
            );
          })}
        </View>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoFocus
          style={{ height: 0, width: 0, opacity: 0 }}
        />

        <Pressable
          disabled={busy}
          onPress={verifyAndContinue}
          style={{
            paddingVertical: 16,
            paddingHorizontal: 12,
            borderRadius: 16,
            borderCurve: 'continuous',
            backgroundColor: busy ? colors.disabled : colors.primary,
            marginTop: 6,
          }}
        >
          <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
            VERIFY & CONTINUE  →
          </Text>
        </Pressable>

        <Pressable disabled={busy} onPress={resend} style={{ paddingVertical: 8 }}>
          <Text selectable style={{ textAlign: 'center', fontWeight: '900', letterSpacing: 1, color: colors.text }}>
            RESEND CODE
          </Text>
        </Pressable>

        <View style={{ alignItems: 'center', paddingTop: 4 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderCurve: 'continuous',
              backgroundColor: colors.card,
            }}
          >
            <Text selectable style={{ fontWeight: '800', color: colors.mutedText }}>
              CODE EXPIRES IN {formatMMSS(secondsLeft)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 26 }}>
        <View style={{ gap: 4 }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800', letterSpacing: 1, fontSize: 12 }}>
            ENCRYPTION STATUS
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '700', fontSize: 12 }}>
            AES-256 SECURED CONNECTION
          </Text>
        </View>
        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '800', letterSpacing: 1, fontSize: 12 }}>
            SYSTEM NODE
          </Text>
          <Text selectable style={{ color: colors.mutedText, fontWeight: '700', fontSize: 12 }}>
            V.04-LHR-99
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
