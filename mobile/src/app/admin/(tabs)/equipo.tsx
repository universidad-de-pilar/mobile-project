import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Card } from '@/components/ui/mostrador/card';
import { Chip } from '@/components/ui/mostrador/chip';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { ListRow } from '@/components/ui/mostrador/list-row';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Toggle } from '@/components/ui/mostrador/toggle';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { Colors, Fonts, Spacing } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import {
  createEmployee,
  listEmployees,
  setEmployeeStores,
  updateEmployee,
  type Employee,
} from '@/lib/admin-api';
import {
  employeeErrorMessage,
  nameError,
  storesSummary,
  toggleStore,
  validateEmployee,
  type EmployeeForm,
} from '@/lib/employee-rules';
import { createSubmitLock } from '@/lib/submit-lock';

const EMPTY: EmployeeForm = { email: '', firstName: '', lastName: '', password: '', storeIds: [] };

export default function TeamTab() {
  const { me } = useSession();
  const stores = me?.stores ?? [];
  const canCreate = me?.permissions.includes('employees:create');
  const canUpdate = me?.permissions.includes('employees:update');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: number; employees?: Employee[] } | null>(null);
  const [form, setForm] = useState(EMPTY);
  // null = alta; con empleado = edición de ese empleado
  const [editing, setEditing] = useState<Employee | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EmployeeForm, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;

  useEffect(() => {
    let active = true;
    listEmployees()
      .then((employees) => active && setLoaded({ key: attempt, employees }))
      .catch(() => active && setLoaded({ key: attempt }));
    return () => {
      active = false;
    };
  }, [attempt]);

  const set = (patch: Partial<EmployeeForm>) => setForm((s) => ({ ...s, ...patch }));
  const reload = () => setAttempt((a) => a + 1);

  function startEdit(e: Employee) {
    setEditing(e);
    setForm({ ...EMPTY, firstName: e.first_name, lastName: e.last_name, storeIds: e.store_ids });
    setFieldErrors({});
    setError(null);
  }

  function reset() {
    setEditing(null);
    setForm(EMPTY);
    setFieldErrors({});
  }

  async function toggle(e: Employee, active: boolean) {
    setBusyId(e.user_id);
    setError(null);
    try {
      await updateEmployee(e.user_id, { is_active: active });
      reload();
    } catch (err) {
      setError(employeeErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function save() {
    setError(null);
    let run: (() => Promise<unknown>) | undefined;
    if (editing) {
      const errors = {
        firstName: nameError(form.firstName),
        lastName: nameError(form.lastName),
        storeIds: form.storeIds.length ? undefined : 'Elegí al menos un local.',
      };
      setFieldErrors(errors);
      if (!Object.values(errors).some(Boolean)) {
        run = async () => {
          await updateEmployee(editing.user_id, { first_name: form.firstName.trim(), last_name: form.lastName.trim() });
          await setEmployeeStores(editing.user_id, form.storeIds);
        };
      }
    } else {
      const { input, errors } = validateEmployee(form);
      setFieldErrors(errors ?? {});
      if (input) run = () => createEmployee(input);
    }
    if (!run || !lock.acquire()) return;
    setSending(true);
    try {
      await run();
      reset();
      reload();
    } catch (err) {
      setError(employeeErrorMessage(err));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  const ready = loaded?.key === attempt ? loaded : null;
  let list;
  if (!ready) {
    list = <FeedbackState type="loading" title="Cargando equipo..." message="Un momento." />;
  } else if (!ready.employees) {
    list = (
      <FeedbackState
        type="error"
        title="No pudimos cargar el equipo"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={reload}
      />
    );
  } else {
    list = (
      <Card>
        {ready.employees.map((e) => {
          const isOwner = e.role === 'owner';
          const editable = !isOwner && canUpdate;
          const where = isOwner ? 'Todos los locales' : storesSummary(e.store_ids, stores);
          return (
            <ListRow
              key={e.user_id}
              title={`${e.first_name} ${e.last_name}${isOwner ? ' · Dueño' : ''}`}
              detail={`${e.email} · ${where}${e.is_active ? '' : ' · inactivo'}`}
              onPress={editable ? () => startEdit(e) : undefined}
              trailing={
                <Toggle
                  label={`${e.is_active ? 'Desactivar' : 'Activar'} a ${e.first_name}`}
                  value={e.is_active}
                  disabled={!editable || e.user_id === me?.user.user_id || busyId === e.user_id}
                  onValueChange={(active) => void toggle(e, active)}
                />
              }
            />
          );
        })}
      </Card>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Equipo" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {list}
        {editing || canCreate ? (
          <>
            <Text accessibilityRole="header" style={styles.heading}>
              {editing ? `Editar a ${editing.first_name}` : 'Nuevo empleado'}
            </Text>
            {editing ? null : (
              <>
                <TextField
                  label="Email"
                  value={form.email}
                  onChangeText={(v) => set({ email: v })}
                  error={fieldErrors.email}
                  editable={!sending}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextField
                  label="Contraseña inicial"
                  value={form.password}
                  onChangeText={(v) => set({ password: v })}
                  error={fieldErrors.password}
                  editable={!sending}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </>
            )}
            <TextField label="Nombre" value={form.firstName} onChangeText={(v) => set({ firstName: v })} error={fieldErrors.firstName} editable={!sending} />
            <TextField label="Apellido" value={form.lastName} onChangeText={(v) => set({ lastName: v })} error={fieldErrors.lastName} editable={!sending} />
            <Text style={styles.label}>Locales</Text>
            <View style={styles.chips}>
              {stores.map((s) => (
                <Chip
                  key={s.store_id}
                  label={s.name}
                  active={form.storeIds.includes(s.store_id)}
                  onPress={() => set({ storeIds: toggleStore(form.storeIds, s.store_id) })}
                />
              ))}
            </View>
            {fieldErrors.storeIds ? <Text accessibilityRole="alert" style={styles.error}>{fieldErrors.storeIds}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Button title={editing ? 'Guardar cambios' : 'Crear empleado'} onPress={() => void save()} loading={sending} fullWidth />
            {editing ? <Button title="Cancelar" variant="secondary" onPress={reset} fullWidth /> : null}
          </>
        ) : error ? (
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: Spacing.md, width: '100%', maxWidth: 560 },
  heading: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: 16, marginTop: Spacing.md },
  label: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: 13 },
});
