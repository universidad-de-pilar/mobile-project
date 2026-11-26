import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Card } from '@/components/ui/mostrador/card';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { ListRow } from '@/components/ui/mostrador/list-row';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Toggle } from '@/components/ui/mostrador/toggle';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { Colors, Fonts, Layout, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import { createTenant, listTenants, setTenantActive, type Tenant } from '@/lib/admin-api';
import { createSubmitLock } from '@/lib/submit-lock';
import { tenantErrorMessage, validateNewTenant, type NewTenantForm } from '@/lib/tenant-rules';

const EMPTY: NewTenantForm = { name: '', slug: '', ownerEmail: '', storeName: '', storeSlug: '' };

const FIELDS: { key: keyof NewTenantForm; label: string }[] = [
  { key: 'name', label: 'Nombre del comercio' },
  { key: 'slug', label: 'Slug (subdominio)' },
  { key: 'ownerEmail', label: 'Email del dueño (ya registrado)' },
  { key: 'storeName', label: 'Nombre del primer local' },
  { key: 'storeSlug', label: 'Slug del primer local' },
];

export default function TenantsTab() {
  const { signOut } = useSession();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: number; tenants?: Tenant[] } | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewTenantForm, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;

  useEffect(() => {
    let active = true;
    listTenants()
      .then((tenants) => active && setLoaded({ key: attempt, tenants }))
      .catch(() => active && setLoaded({ key: attempt }));
    return () => {
      active = false;
    };
  }, [attempt]);

  const replace = (t: Tenant) =>
    setLoaded((l) => (l ? { ...l, tenants: l.tenants?.map((x) => (x.tenant_id === t.tenant_id ? t : x)) } : l));

  async function toggle(t: Tenant, active: boolean) {
    setBusyId(t.tenant_id);
    setError(null);
    try {
      replace(await setTenantActive(t.tenant_id, active));
    } catch (e) {
      setError(tenantErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    const { input, errors } = validateNewTenant(form);
    setFieldErrors(errors ?? {});
    setError(null);
    if (!input || !lock.acquire()) return;
    setSending(true);
    try {
      await createTenant(input);
      setForm(EMPTY);
      setCreating(false);
      setAttempt((a) => a + 1);
    } catch (e) {
      setError(tenantErrorMessage(e));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  const ready = loaded?.key === attempt ? loaded : null;
  let list;
  if (!ready) {
    list = <FeedbackState type="loading" title="Cargando comercios..." message="Un momento." />;
  } else if (!ready.tenants) {
    list = (
      <FeedbackState
        type="error"
        title="No pudimos cargar los comercios"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
  } else if (ready.tenants.length === 0) {
    list = <FeedbackState type="empty" title="Todavía no hay comercios" message="Creá el primero arriba." />;
  } else {
    list = (
      <Card>
        {ready.tenants.map((t) => (
          <ListRow
            key={t.tenant_id}
            title={t.name}
            detail={`${t.slug}${t.is_active ? '' : ' · suspendido'}`}
            trailing={
              <Toggle
                label={`${t.is_active ? 'Suspender' : 'Reactivar'} ${t.name}`}
                value={t.is_active}
                disabled={busyId === t.tenant_id}
                onValueChange={(active) => void toggle(t, active)}
              />
            }
          />
        ))}
      </Card>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Comercios" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {creating ? (
          <>
            <Text accessibilityRole="header" style={styles.heading}>Nuevo comercio</Text>
            {FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                value={form[f.key]}
                onChangeText={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
                error={fieldErrors[f.key]}
                editable={!sending}
                autoCapitalize="none"
                keyboardType={f.key === 'ownerEmail' ? 'email-address' : 'default'}
              />
            ))}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Button title="Crear comercio" onPress={() => void create()} loading={sending} fullWidth />
            <Button title="Cancelar" variant="ghost" onPress={() => setCreating(false)} fullWidth />
          </>
        ) : (
          <>
            <Button title="+ Nuevo comercio" onPress={() => setCreating(true)} fullWidth />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </>
        )}
        {list}
        <Button title="Cerrar sesión" variant="ghostDanger" onPress={() => void signOut()} fullWidth style={styles.logout} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Layout.screenPadding, gap: Spacing.md, width: '100%', maxWidth: 560 },
  heading: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: Typography.large, marginTop: Spacing.section },
  logout: { marginTop: Spacing.xxl },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.caption },
});
