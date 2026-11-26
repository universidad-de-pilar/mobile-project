import { Redirect } from 'expo-router';

// The tabs layout sends signed-out users on to the login.
export default function AdminIndex() {
  return <Redirect href="/admin/catalogo" />;
}
