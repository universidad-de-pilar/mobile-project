import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuQr } from '@/components/admin/menu-qr';
import { Button } from '@/components/ui/mostrador/button';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { StickyFooter } from '@/components/ui/mostrador/sticky-footer';
import { TextField } from '@/components/ui/mostrador/text-field';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { Colors, Fonts, Layout, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import { getStore, updateStore, type Store } from '@/lib/admin-api';
import { formatWhatsapp, parseWhatsapp, storeErrorMessage } from '@/lib/store-rules';
import { createSubmitLock } from '@/lib/submit-lock';

type Loaded = { key: string; store?: Store };

export default function SettingsTab() {
  const { store: session, me, signOut, refresh } = useSession();
  const canEdit = Boolean(me?.permissions.includes('stores:update'));
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [url, setUrl] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;
  const storeId = session?.store_id;
  const key = `${storeId}:${attempt}`;

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    getStore(storeId)
      .then((s) => {
        if (!active) return;
        setName(s.name);
        setWhatsapp(formatWhatsapp(s.whatsapp_number));
        setUrl(s.self_order_url);
        setLoaded({ key, store: s });
      })
      .catch(() => active && setLoaded({ key }));
    return () => {
      active = false;
    };
  }, [storeId, key]);

  async function save() {
    if (!session) return;
    const trimmed = name.trim();
    const parsed = parseWhatsapp(whatsapp);
    setNameError(!trimmed ? 'Ingresá el nombre del local.' : trimmed.length > 150 ? 'El nombre admite hasta 150 caracteres.' : null);
    setWhatsappError(parsed.error ?? null);
    setFormError(null);
    setSaved(false);
    if (!trimmed || trimmed.length > 150 || parsed.error) return;
    if (!lock.acquire()) return;
    setSending(true);
    try {
      const updated = await updateStore(session.store_id, { name: trimmed, whatsapp_number: parsed.value });
      setName(updated.name);
      setWhatsapp(formatWhatsapp(updated.whatsapp_number));
      setSaved(true);
      await refresh();
    } catch (e) {
      setFormError(storeErrorMessage(e));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  const ready = loaded?.key === key ? loaded : null;
  let body;
  if (!ready) {
    body = <FeedbackState type="loading" title="Cargando ajustes..." message="Un momento." />;
  } else if (!ready.store) {
    body = (
      <FeedbackState
        type="error"
        title="No pudimos cargar los ajustes"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
  } else {
    body = (
      <>
        <TextField label="Nombre del local" value={name} onChangeText={setName} editable={canEdit && !sending} error={nameError ?? undefined} maxLength={150} />
        <View style={styles.field}>
          <TextField
            label="WhatsApp del local"
            value={whatsapp}
            onChangeText={setWhatsapp}
            editable={canEdit && !sending}
            error={whatsappError ?? undefined}
            keyboardType="phone-pad"
            placeholder="+54 9 11 5555-0142"
          />
          <Text style={styles.helper}>Si lo dejás vacío, las órdenes se registran igual y las ves en Órdenes.</Text>
        </View>
        <View style={styles.urlBox}>
          <Text style={styles.urlLabel}>URL de autopedido (va en el QR)</Text>
          <Text selectable style={styles.url}>{url}</Text>
        </View>
        <MenuQr url={url} />
        {canEdit ? null : <Text style={styles.helper}>Tu usuario puede ver estos datos pero no editarlos.</Text>}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Ajustes" store={session?.name} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
        <Button title="Cerrar sesión" variant="ghostDanger" onPress={() => void signOut()} fullWidth style={styles.logout} />
      </ScrollView>
      {ready?.store && canEdit ? (
        <StickyFooter safeArea={false}>
          {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
          {saved ? <Text accessibilityRole="alert" style={styles.success}>Cambios guardados.</Text> : null}
          <Button title="Guardar" onPress={() => void save()} loading={sending} fullWidth />
        </StickyFooter>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Layout.screenPadding, gap: Spacing.md, width: '100%', maxWidth: 560 },
  logout: { marginTop: Spacing.xxl },
  field: { gap: Spacing.sm },
  helper: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  urlBox: { gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primarySoft },
  urlLabel: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  url: { color: Colors.primary, fontFamily: Fonts.bold, fontSize: Typography.body },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: Typography.small },
  success: { color: Colors.success, fontFamily: Fonts.medium, fontSize: Typography.caption },
});
