import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, configureAuth, getMe, type Me } from '@/lib/api';
import { clearToken, loadToken, saveToken } from '@/lib/session-storage';
import { isTokenExpired } from '@/lib/session-token';

type Store = Me['stores'][number];

type SessionValue = {
  status: 'loading' | 'out' | 'in';
  me: Me | null;
  /** ponytail: first store from /me; a multi-store owner needs a store switcher here. */
  store: Store | undefined;
  /** Stores the token and loads /me; throws (and keeps the session out) if either fails. */
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reloads /me, e.g. after renaming the store. */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionValue['status']>('loading');
  const [me, setMe] = useState<Me | null>(null);
  // Ref: the API client reads it outside React, and a 401 must see the latest token.
  const token = useRef<string | null>(null);

  const signOut = useCallback(async () => {
    token.current = null;
    setMe(null);
    setStatus('out');
    await clearToken();
  }, []);

  const refresh = useCallback(async () => setMe(await getMe()), []);

  const signIn = useCallback(
    async (next: string) => {
      token.current = next;
      try {
        const profile = await getMe();
        await saveToken(next);
        setMe(profile);
        setStatus('in');
      } catch (error) {
        // A connection error keeps the stored token so a reload while offline does not log out.
        if (error instanceof ApiError && error.status === 0) {
          token.current = null;
          setStatus('out');
        } else await signOut();
        throw error;
      }
    },
    [signOut],
  );

  useEffect(() => {
    configureAuth({ getToken: () => token.current, onUnauthorized: () => void signOut() });
    (async () => {
      const stored = await loadToken();
      if (!stored || isTokenExpired(stored)) return signOut();
      try {
        await signIn(stored);
      } catch {
        // signIn already left the session out.
      }
    })();
    return () => configureAuth(null);
  }, [signIn, signOut]);

  const value = useMemo(
    () => ({ status, me, store: me?.stores[0], signIn, signOut, refresh }),
    [status, me, signIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
