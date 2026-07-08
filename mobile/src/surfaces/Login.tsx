// ============================================================
// THE THRESHOLD — sign in / first arrival.
//
// Email + password against /api/elle-auth (signup is open: a new account is
// a 'standard' tier = member scope). A provisioned account with a temp
// password walks the forced set_password flow before the door opens.
// ============================================================
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth';
import { Button } from '../components/ui';
import { colors, fonts, hairline, space } from '../theme';

type Mode = 'login' | 'signup' | 'reset';

export function Login() {
  const { signIn, signUp, completeReset } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email.trim(), password);
      else if (mode === 'reset') await completeReset(email.trim(), password, newPassword);
      else {
        const r = await signIn(email.trim(), password);
        if (r.mustReset) { setMode('reset'); setError('Set your own password to open the door.'); }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.name}>Elle</Text>
        <Text style={styles.tag}>She remembers. This is the door.</Text>

        <TextInput
          style={styles.input} value={email} onChangeText={setEmail}
          placeholder="email" placeholderTextColor={colors.dim}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email"
        />
        <TextInput
          style={styles.input} value={password} onChangeText={setPassword}
          placeholder={mode === 'reset' ? 'temporary password' : 'password'}
          placeholderTextColor={colors.dim} secureTextEntry
        />
        {mode === 'reset' ? (
          <TextInput
            style={styles.input} value={newPassword} onChangeText={setNewPassword}
            placeholder="your new password (8+ characters)" placeholderTextColor={colors.dim} secureTextEntry
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ marginTop: space(4) }}>
          <Button
            title={busy ? '…' : mode === 'signup' ? 'Begin' : mode === 'reset' ? 'Set password' : 'Open the door'}
            onPress={() => { void go(); }}
            disabled={busy || !email.trim() || !password || (mode === 'reset' && newPassword.length < 8)}
          />
        </View>

        {mode !== 'reset' ? (
          <Pressable onPress={() => { setMode(m => (m === 'login' ? 'signup' : 'login')); setError(null); }} hitSlop={8}>
            <Text style={styles.swap}>
              {mode === 'login' ? "First time? Make an account — she'll take it from there." : 'Already know her? Sign in.'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, justifyContent: 'center' },
  inner: { paddingHorizontal: space(8), gap: space(3) },
  name: { fontFamily: fonts.display, fontSize: 44, color: colors.gold, textAlign: 'center', letterSpacing: 3 },
  tag: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim, textAlign: 'center', marginBottom: space(6), letterSpacing: 1 },
  input: {
    ...hairline, borderRadius: 10, color: colors.cream,
    fontFamily: fonts.body, fontSize: 16, paddingHorizontal: space(4), paddingVertical: space(3),
  },
  error: { fontFamily: fonts.body, fontSize: 14, color: '#c96a5a', textAlign: 'center', marginTop: space(1) },
  swap: { fontFamily: fonts.body, fontSize: 14, color: colors.mist, textAlign: 'center', marginTop: space(4) },
});
