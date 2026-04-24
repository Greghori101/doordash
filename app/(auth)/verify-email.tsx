import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { completeEmailSignIn, getPendingSignInEmail, sendEmailSignInLink } from '@/src/auth/email-link-auth';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { firebaseAuth } from '@/src/firebase/client';
import { useAppTheme } from '@/src/theme/theme';

export default function VerifyEmailScreen() {
  const { colors } = useAppTheme();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam.trim().toLowerCase() : '';

  const [busy, setBusy] = React.useState(false);
  const [resent, setResent] = React.useState(false);
  const [pasteLink, setPasteLink] = React.useState('');
  const [showPaste, setShowPaste] = React.useState(false);

  async function handleResend() {
    if (!email) return;
    setBusy(true);
    try {
      await sendEmailSignInLink(email);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (e: any) {
      Alert.alert('Could not resend', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function handlePasteLink() {
    const link = pasteLink.trim();
    if (!link) {
      Alert.alert('Empty link', 'Paste the sign-in link from your email.');
      return;
    }
    if (!isSignInWithEmailLink(firebaseAuth, link)) {
      Alert.alert('Invalid link', 'This does not appear to be a valid sign-in link. Copy the full URL from your email.');
      return;
    }
    setBusy(true);
    try {
      // Use stored email (from when link was sent) or the email passed as param
      let resolvedEmail = email;
      if (!resolvedEmail) {
        resolvedEmail = (await getPendingSignInEmail()) ?? '';
      }
      if (!resolvedEmail) {
        Alert.alert('Email required', 'Could not find your email. Go back to sign-in and enter your email first.');
        return;
      }
      await signInWithEmailLink(firebaseAuth, resolvedEmail, link);
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
      contentContainerStyle={{ padding: 18, gap: 16 }}
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

      <View style={{ alignItems: 'center', paddingTop: 22, gap: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            borderCurve: 'continuous',
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome name="envelope" size={26} color={colors.primaryText} />
        </View>
        <Text selectable style={{ fontSize: 32, fontWeight: '900', letterSpacing: -1, color: colors.text, textAlign: 'center' }}>
          CHECK YOUR EMAIL
        </Text>
        <Text selectable style={{ color: colors.mutedText, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', lineHeight: 22 }}>
          We sent a sign-in link to{'\n'}
          <Text selectable style={{ color: colors.text, fontWeight: '900' }}>{email || '—'}</Text>
        </Text>
      </View>

      <View
        style={{
          borderRadius: 22,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.primary, marginTop: 7 }} />
          <Text selectable style={{ flex: 1, color: colors.text, fontWeight: '700', lineHeight: 22 }}>
            Open the email on this device and tap the sign-in link — it will open the app automatically.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colors.mutedText, marginTop: 7 }} />
          <Text selectable style={{ flex: 1, color: colors.mutedText, fontWeight: '700', lineHeight: 22 }}>
            Check your spam folder if the email doesn't arrive within a minute.
          </Text>
        </View>
      </View>

      <Pressable
        disabled={busy}
        onPress={handleResend}
        style={{
          paddingVertical: 14,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: busy ? colors.disabled : colors.secondary,
        }}
      >
        <Text selectable style={{ color: colors.text, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
          {resent ? '✓ LINK SENT' : 'RESEND LINK'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setShowPaste((v) => !v)} style={{ paddingVertical: 8 }}>
        <Text selectable style={{ textAlign: 'center', fontWeight: '800', color: colors.mutedText, letterSpacing: 0.5 }}>
          {showPaste ? 'Hide' : "Didn't get the link? Paste it manually"}
        </Text>
      </Pressable>

      {showPaste ? (
        <View
          style={{
            borderRadius: 18,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 12,
          }}
        >
          <Text selectable style={{ color: colors.mutedText, fontWeight: '900', letterSpacing: 1, fontSize: 12 }}>
            PASTE SIGN-IN LINK FROM EMAIL
          </Text>
          <TextInput
            value={pasteLink}
            onChangeText={setPasteLink}
            placeholder="https://doordash-9af85.firebaseapp.com/..."
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={{
              backgroundColor: colors.card,
              padding: 12,
              borderRadius: 12,
              borderCurve: 'continuous',
              color: colors.text,
              fontWeight: '700',
              fontSize: 13,
              minHeight: 80,
            }}
          />
          <Pressable
            disabled={busy}
            onPress={handlePasteLink}
            style={{
              paddingVertical: 14,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: busy ? colors.disabled : colors.primary,
            }}
          >
            <Text selectable style={{ color: colors.primaryText, textAlign: 'center', fontWeight: '900', letterSpacing: 1 }}>
              SIGN IN WITH LINK
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
