import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

import { DEFAULT_STORE_SLUG } from '@/lib/tenant';

// La app nativa es solo el backoffice; el menú digital del cliente se sirve por web.
export default function Index() {
  return <Redirect href={Platform.OS === 'web' ? `/${DEFAULT_STORE_SLUG}` : '/admin'} />;
}
