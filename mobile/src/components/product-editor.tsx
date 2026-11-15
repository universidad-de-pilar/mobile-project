import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Chip } from '@/components/ui/mostrador/chip';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { TextField } from '@/components/ui/mostrador/text-field';
import { Toggle } from '@/components/ui/mostrador/toggle';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { Colors, Fonts, Radius, Spacing } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import {
  createProduct,
  getProduct,
  listCategories,
  updateProduct,
  uploadProductImage,
  type Category,
  type PickedImage,
  type Product,
} from '@/lib/admin-api';
import {
  checkImage,
  parsePrice,
  priceToInput,
  productErrorMessage,
  uploadErrorMessage,
  validateProduct,
  type ProductErrors,
} from '@/lib/product-rules';
import { createSubmitLock } from '@/lib/submit-lock';

type Loaded = { key: string; categories?: Category[]; product?: Product };

/** Shared by `/admin/catalogo/nuevo` (no id) and `/admin/catalogo/[id]`. */
export function ProductEditor({ id }: { id?: string }) {
  const { store, me } = useSession();
  const allowed = me?.permissions.includes(id ? 'products:update' : 'products:create');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${store?.store_id}:${id}:${attempt}`;

  useEffect(() => {
    if (!store || !allowed) return;
    let active = true;
    Promise.all([listCategories(store.store_id), id ? getProduct(id) : undefined])
      .then(([categories, product]) => active && setLoaded({ key, categories, product }))
      .catch(() => active && setLoaded({ key }));
    return () => {
      active = false;
    };
  }, [store, id, allowed, key]);

  const ready = loaded?.key === key ? loaded : null;
  let body;
  if (!allowed) {
    body = <FeedbackState type="error" title="Sin permiso" message="Tu usuario no puede editar productos." />;
  } else if (!ready) {
    body = <FeedbackState type="loading" title="Cargando..." message="Un momento." />;
  } else if (!ready.categories) {
    body = (
      <FeedbackState
        type="error"
        title="No pudimos cargar el producto"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
  } else {
    body = <Form storeId={store!.store_id} categories={ready.categories} product={ready.product} />;
  }

  return (
    <View style={styles.screen}>
      <TopBar title={id ? 'Editar producto' : 'Nuevo producto'} store={store?.name} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
    </View>
  );
}

function Form({ storeId, categories, product }: { storeId: string; categories: Category[]; product?: Product }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? priceToInput(product.price) : '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [glutenFree, setGlutenFree] = useState(product?.gluten_free ?? false);
  const [available, setAvailable] = useState(product?.is_available ?? true);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // A new product is created once; a retry after a failed upload patches it instead.
  const savedId = useRef<string | null>(product?.product_id ?? null);
  const lock = useRef(createSubmitLock()).current;

  async function pickImage() {
    // On web the picker rejects non-image files by throwing.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] }).catch(() => null);
    if (!result) return setImageError('Elegí una imagen JPG o PNG.');
    if (result.canceled) return;
    const asset = result.assets[0];
    const message = checkImage({
      mimeType: asset.mimeType ?? asset.file?.type,
      fileSize: asset.fileSize ?? asset.file?.size,
    });
    setImageError(message);
    if (!message) setImage(asset);
  }

  function fail(message: string) {
    setError(message);
    lock.release();
    setSending(false);
  }

  async function submit() {
    const found = validateProduct({ name, description, price, categoryId, sku });
    setErrors(found);
    setError(null);
    if (Object.keys(found).length > 0 || !lock.acquire()) return;
    setSending(true);
    try {
      const fields = {
        category_id: categoryId,
        name: name.trim(),
        price: parsePrice(price)!,
        is_available: available,
        sku: sku.trim(),
        gluten_free: glutenFree,
      };
      if (savedId.current) {
        await updateProduct(savedId.current, { ...fields, description: description.trim() || null });
      } else {
        const created = await createProduct(storeId, { ...fields, description: description.trim() || undefined });
        savedId.current = created.product_id;
      }
    } catch (e) {
      return fail(productErrorMessage(e));
    }
    if (image) {
      try {
        await uploadProductImage(savedId.current, image);
      } catch (e) {
        return fail(`El producto se guardó, pero la imagen no: ${uploadErrorMessage(e)} Tocá Guardar para reintentar.`);
      }
    }
    router.replace('/admin/catalogo');
  }

  const preview = image?.uri ?? product?.image_url;
  const categoryName = categories.find((c) => c.category_id === categoryId)?.name;

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Imagen del producto" onPress={pickImage} style={styles.image}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} contentFit="cover" />
        ) : (
          <>
            <Text style={styles.imageTitle}>Imagen del producto</Text>
            <Text style={styles.imageHint}>JPG o PNG · hasta 5 MB</Text>
          </>
        )}
      </Pressable>
      {imageError ? <Text accessibilityRole="alert" style={styles.error}>{imageError}</Text> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} error={errors.name} editable={!sending} />
      <TextField label="SKU" value={sku} onChangeText={setSku} error={errors.sku} autoCapitalize="characters" editable={!sending} />
      <TextField
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        editable={!sending}
        multiline
      />
      <View style={styles.pair}>
        <TextField
          label="Precio"
          value={price}
          onChangeText={setPrice}
          error={errors.price}
          keyboardType="decimal-pad"
          editable={!sending}
          containerStyle={styles.half}
        />
        <View style={styles.half}>
          <Text style={styles.label}>Categoría</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Categoría"
            onPress={() => setPicking((v) => !v)}
            style={styles.select}
          >
            <Text numberOfLines={1} style={categoryName ? styles.selectText : styles.selectEmpty}>
              {categoryName ?? 'Elegir'}
            </Text>
          </Pressable>
          {errors.categoryId ? <Text accessibilityRole="alert" style={styles.error}>{errors.categoryId}</Text> : null}
        </View>
      </View>
      {picking ? (
        <View style={styles.options}>
          {categories.length === 0 ? <Text style={styles.imageHint}>Creá una categoría desde el catálogo.</Text> : null}
          {categories.map((c) => (
            <Chip
              key={c.category_id}
              label={c.name}
              active={c.category_id === categoryId}
              onPress={() => {
                setCategoryId(c.category_id);
                setPicking(false);
              }}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.availability}>
        <Text style={styles.selectText}>Disponible para pedir</Text>
        <Toggle label="Disponible para pedir" value={available} onValueChange={setAvailable} disabled={sending} />
      </View>

      <View style={styles.availability}>
        <Text style={styles.selectText}>Sin TACC</Text>
        <Toggle label="Sin TACC" value={glutenFree} onValueChange={setGlutenFree} disabled={sending} />
      </View>

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Button title={product ? 'Guardar cambios' : 'Crear producto'} onPress={submit} loading={sending} fullWidth />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: Spacing.md, width: '100%', maxWidth: 560 },
  image: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: 160 },
  imageTitle: { color: Colors.primary, fontFamily: Fonts.bold, fontSize: 13 },
  imageHint: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 11 },
  pair: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1, gap: 6 },
  label: { color: Colors.muted, fontFamily: Fonts.medium, fontSize: 13 },
  select: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  selectText: { color: Colors.ink, fontFamily: Fonts.medium, fontSize: 14 },
  selectEmpty: { color: Colors.muted, fontFamily: Fonts.body, fontSize: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  error: { color: Colors.danger, fontFamily: Fonts.body, fontSize: 12 },
});
