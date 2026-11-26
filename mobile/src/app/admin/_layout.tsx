import { Stack } from 'expo-router';

import { SessionProvider } from '@/context/SessionContext';

export default function AdminLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
