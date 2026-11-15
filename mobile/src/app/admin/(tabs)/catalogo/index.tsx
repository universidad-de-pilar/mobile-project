import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Chip } from '@/components/ui/mostrador/chip';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { ListRow } from '@/components/ui/mostrador/list-row';
import { TextField } from '@/components/ui/mostrador/text-field';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { narrowBlock, useWide, wideGrid } from '@/components/ui/mostrador/use-wide';
import { Colors, Fonts, Radius, Spacing } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import { createCategory, listCategories, listProducts, type Category, type Product } from '@/lib/admin-api';
import { formatPrice } from '@/lib/format-price';
import { categoryErrorMessage, filterAdminProducts } from '@/lib/product-rules';
import { createSubmitLock } from '@/lib/submit-lock';

type Result = { key: string; data?: { categories: Category[]; products: Product[] } };

export default function CatalogTab() {
  const router = useRouter();
  const wide = useWide();
  const { store, me } = useSession();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [compact, setCompact] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(createSubmitLock()).current;

  const can = (code: string) => Boolean(me?.permissions.includes(code));
  // Loading is derived from the key; refocusing (after saving a product) refetches.
  const key = `${store?.store_id}:${attempt}:${focused}`;

  useEffect(() => {
    if (!store || !focused) return;
    let active = true;
    Promise.all([listCategories(store.store_id), listProducts(store.store_id)])
      .then(([categories, products]) => active && setResult({ key, data: { categories, products } }))
      .catch(() => active && setResult({ key }));
    return () => {
      active = false;
    };
  }, [store, focused, key]);

  async function addCategory() {
    const name = newName.trim();
    if (!store || !name) return setAddError('Ingresá el nombre.');
    if (!lock.acquire()) return;
    setSending(true);
    setAddError(null);
    try {
      const created = await createCategory(store.store_id, name, result?.data?.categories.length ?? 0);
      setActiveId(created.category_id);
      setAdding(false);
      setNewName('');
      setAttempt((a) => a + 1);
    } catch (e) {
      setAddError(categoryErrorMessage(e));
    } finally {
      lock.release();
      setSending(false);
    }
  }

  const loaded = result?.key === key ? result : null;
  const data = loaded?.data;
  const products = data ? filterAdminProducts(data.products, { categoryId: activeId, query, onlyAvailable }) : [];
  const filtering = Boolean(query.trim()) || onlyAvailable;

  let body;
  if (!loaded) {
    body = <FeedbackState type="loading" title="Cargando catálogo..." message="Un momento." />;
  } else if (!data) {
    body = (
      <FeedbackState
        type="error"
        title="No pudimos cargar el catálogo"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
  } else if (products.length === 0 && filtering) {
    body = <FeedbackState type="empty" title="Sin resultados" message="Ningún producto coincide con la búsqueda o los filtros." />;
  } else if (products.length === 0) {
    body = (
      <FeedbackState
        type="empty"
        title="No hay productos"
        message={can('products:create') ? 'Agregá el primero con "+ Nuevo producto".' : 'Todavía no hay productos en esta categoría.'}
      />
    );
  } else {
    body = (
      <View style={compact ? styles.table : [styles.list, wide && wideGrid(320)]}>
        {compact ? (
          <View style={[styles.dense, styles.denseHeader]}>
            <Text style={[styles.headerText, styles.denseName]}>Producto</Text>
            {wide ? <Text style={[styles.headerText, styles.denseSku]}>SKU</Text> : null}
            {wide ? <Text style={[styles.headerText, styles.denseState]}>Estado</Text> : null}
            <Text style={styles.headerText}>Precio</Text>
          </View>
        ) : null}
        {products.map((p) => {
          const onPress = can('products:update') ? () => router.push(`/admin/catalogo/${p.product_id}`) : undefined;
          return compact ? (
            <Pressable key={p.product_id} accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={styles.dense}>
              <View style={styles.denseName}>
                <Text numberOfLines={1} style={styles.denseTitle}>{p.name}</Text>
                {!wide && p.sku ? <Text numberOfLines={1} style={styles.denseMuted}>{p.sku}</Text> : null}
              </View>
              {wide ? <Text numberOfLines={1} style={[styles.denseMuted, styles.denseSku]}>{p.sku ?? '—'}</Text> : null}
              {wide ? <Text style={[styles.denseMuted, styles.denseState]}>{p.is_available ? 'Disponible' : 'No disponible'}</Text> : null}
              <Text style={styles.denseTitle}>{formatPrice(p.price)}</Text>
            </Pressable>
          ) : (
          <ListRow
            key={p.product_id}
            title={p.name}
            detail={[p.sku, p.is_available ? 'Disponible' : 'No disponible'].filter(Boolean).join(' · ')}
            value={formatPrice(p.price)}
            image={p.image_url}
            onPress={onPress}
          />
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Catálogo" store={store?.name} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {data && can('products:create') ? (
          <Button title="+ Nuevo producto" onPress={() => router.push('/admin/catalogo/nuevo')} fullWidth style={wide && narrowBlock} />
        ) : null}
        {data ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Todas" active={!activeId} onPress={() => setActiveId(null)} />
            {data.categories.map((c) => (
              <Chip key={c.category_id} label={c.name} active={activeId === c.category_id} onPress={() => setActiveId(c.category_id)} />
            ))}
            {can('categories:create') ? <Chip label="+ Categoría" onPress={() => setAdding((v) => !v)} /> : null}
          </ScrollView>
        ) : null}
        {data ? (
          <View style={[styles.adding, wide && narrowBlock]}>
            <TextField accessibilityLabel="Buscar por nombre o SKU" placeholder="Buscar por nombre o SKU" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="Disponibles" active={onlyAvailable} onPress={() => setOnlyAvailable((v) => !v)} />
              <Chip label="Vista compacta" active={compact} onPress={() => setCompact((v) => !v)} />
            </ScrollView>
          </View>
        ) : null}
        {adding ? (
          <View style={[styles.adding, wide && narrowBlock]}>
            <TextField label="Nueva categoría" value={newName} onChangeText={setNewName} editable={!sending} maxLength={80} onSubmitEditing={addCategory} />
            {addError ? <Text accessibilityRole="alert" style={styles.error}>{addError}</Text> : null}
            <Button title="Agregar categoría" onPress={addCategory} loading={sending} fullWidth />
          </View>
        ) : null}
        {body}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: Spacing.md },
  chips: { gap: Spacing.sm },
  list: { gap: Spacing.md },
  adding: { gap: Spacing.sm },
  table: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  dense: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  denseHeader: { backgroundColor: Colors.bg },
  headerText: { color: Colors.muted, fontFamily: Fonts.bold, fontSize: 11, textTransform: 'uppercase' },
  denseName: { flex: 2 },
  denseSku: { flex: 1 },
  denseState: { width: 110 },
  denseTitle: { color: Colors.ink, fontFamily: Fonts.bold, fontSize: 13 },
  denseMuted: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 12 },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: 12 },
});
