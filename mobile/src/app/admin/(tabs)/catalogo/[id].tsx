import { useLocalSearchParams } from 'expo-router';

import { ProductEditor } from '@/components/product-editor';

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductEditor id={id} />;
}
