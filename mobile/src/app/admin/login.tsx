import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import { login } from '@/lib/api';
import { loginErrorMessage, validateLogin } from '@/lib/login-rules';
import { createSubmitLock } from '@/lib/submit-lock';
import { resolveTenantSlug } from '@/lib/tenant';

export default function LoginScreen() {
  const { status, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;

  if (status === 'loading') return null;
  if (status === 'in') return <Redirect href="/admin/catalogo" />;

  const host = Platform.OS === 'web' ? window.location.hostname : (resolveTenantSlug() ?? '');

  async function submit() {
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    setError(null);
    if (errors.email || errors.password || !lock.acquire()) return;
    setSending(true);
    try {
      await signIn(await login(email.trim(), password));
    } catch (e) {
      setError(loginErrorMessage(e));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.logo}>
          <Ionicons name="storefront" size={30} color={Colors.surface} />
        </View>
        <Text accessibilityRole="header" style={styles.brand}>mostrador</Text>
        <Text style={styles.subtitle}>Ingresá para administrar tu local</Text>

        <View style={styles.fields}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!sending}
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            secureTextEntry
            autoComplete="current-password"
            editable={!sending}
            onSubmitEditing={submit}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Button title="Ingresar" onPress={submit} loading={sending} fullWidth />
        </View>
        {host ? <Text style={styles.host}>{host}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: Layout.screenPadding },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center', alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginTop: Spacing.xl, color: Colors.ink, fontFamily: Fonts.title, fontSize: Typography.title },
  subtitle: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.body, marginBottom: Spacing.xl },
  fields: { width: '100%', gap: Spacing.md },
  error: { color: Colors.danger, fontFamily: Fonts.medium, fontSize: Typography.caption },
  host: { marginTop: Spacing.lg, color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
});
