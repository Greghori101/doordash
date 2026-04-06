import { router } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { firebaseAuth } from '@/src/firebase/client';

function getAuthErrorMessage(error: any) {
  const code = String(error?.code ?? '');
  if (code === 'auth/operation-not-allowed') return 'Enable Email/Password in Firebase Console → Authentication.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  if (code === 'auth/invalid-email') return 'Invalid email address.';
  if (code === 'auth/missing-email') return 'Enter your email.';
  if (code === 'auth/missing-password') return 'Enter your password.';
  if (code === 'auth/weak-password') return 'Password is too weak (min 6 characters).';
  if (code === 'auth/email-already-in-use') return 'This email is already in use.';
  if (code === 'auth/invalid-credential') return 'Invalid credentials.';
  if (code === 'auth/user-not-found') return 'No account found for this email.';
  if (code === 'auth/wrong-password') return 'Wrong password.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
  return String(error?.message ?? 'Unknown error');
}

export default function SignInScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const normalizedEmail = email.trim();
  const canSubmit = normalizedEmail.length > 0 && password.length > 0 && !busy;

  async function handleSignIn() {
    if (!normalizedEmail || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Sign in failed', getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    if (!normalizedEmail || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(firebaseAuth, normalizedEmail, password);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Sign up failed', getAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text selectable style={{ fontSize: 22, fontWeight: '700' }}>
        DoorDrop
      </Text>

      <View style={{ gap: 8 }}>
        <Text selectable>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          style={{
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.12)',
            padding: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
          }}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text selectable>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.12)',
            padding: 12,
            borderRadius: 12,
            borderCurve: 'continuous',
          }}
        />
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={handleSignIn}
        style={{
          padding: 14,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: canSubmit ? 'black' : 'rgba(0,0,0,0.15)',
        }}
      >
        <Text selectable style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
          Sign in
        </Text>
      </Pressable>

      <Pressable
        disabled={!canSubmit}
        onPress={handleSignUp}
        style={{
          padding: 14,
          borderRadius: 14,
          borderCurve: 'continuous',
          backgroundColor: canSubmit ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
        }}
      >
        <Text selectable style={{ textAlign: 'center', fontWeight: '700' }}>
          Create account
        </Text>
      </Pressable>
    </ScrollView>
  );
}
