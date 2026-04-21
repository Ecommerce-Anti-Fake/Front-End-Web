import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiRequest } from '../../lib/api-client';
import type { AuthSession, LoginResponse } from '../../types';
import {
  clearSession,
  ensureSessionRefreshSchedule,
  getSession,
  setSession,
  subscribeToSession,
} from './auth-session';

type AuthContextValue = {
  session: AuthSession;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

export type RegisterPayload = {
  email?: string;
  phone?: string;
  displayName?: string;
  password: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession>(() => getSession());

  useEffect(() => subscribeToSession(setSessionState), []);

  useEffect(() => {
    ensureSessionRefreshSchedule();
  }, [session?.accessToken, session?.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      async login(identifier, password) {
        const response = await apiRequest<LoginResponse>('/auth/login', {
          method: 'POST',
          body: {
            username: identifier,
            password,
          },
        });
        setSession(response);
      },
      async register(payload) {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: payload,
        });
      },
      async logout() {
        if (session?.refreshToken) {
          try {
            await apiRequest('/auth/logout', {
              method: 'POST',
              body: {
                refreshToken: session.refreshToken,
              },
              accessToken: session.accessToken,
            });
          } catch {
            // Ignore logout transport errors and clear local session anyway.
          }
        }

        clearSession();
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
