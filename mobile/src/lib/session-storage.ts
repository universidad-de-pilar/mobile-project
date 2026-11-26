import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'mostrador.token';

export async function loadToken(): Promise<string | null> {
  try {
    return Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  } catch {}
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') window.localStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
