import { Stack, useGlobalSearchParams, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Colors } from '@/components/ui/mostrador/tokens';
import { useWide } from '@/components/ui/mostrador/use-wide';
import { useCart } from '@/context/CartContext';
import { getPublicCatalog } from '@/lib/api';
import { parseSourceScreenId, saveSourceScreen } from '@/lib/source-screen';

export default function StoreLayout() {
  const { storeSlug, src } = useGlobalSearchParams<{ storeSlug: string; src?: string }>();
  const { bindStore, setStoreName, setTenantName } = useCart();
  const wide = useWide();
  // Catalog is the index route (one segment); cart, confirm and done get the narrow column.
  const isCatalog = useSegments().length === 1;

  // Kept per store so the order still carries the QR origin after leaving the landing URL.
  useEffect(() => {
    const id = parseSourceScreenId(src);
    if (id) saveSourceScreen(storeSlug, id);
  }, [storeSlug, src]);

  useEffect(() => {
    bindStore(storeSlug);
    let active = true;
    // The name is cosmetic: on failure the headers keep showing the slug.
    getPublicCatalog(storeSlug)
      .then((c) => {
        if (!active) return;
        setStoreName(c.store.name);
        setTenantName(c.tenant.name);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storeSlug, bindStore, setStoreName, setTenantName]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: wide ? (isCatalog ? 960 : 520) : 480, alignSelf: 'center' }}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}
