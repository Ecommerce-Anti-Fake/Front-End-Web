import { API_BASE_URL } from '../../lib/api-client';
import type { AuthSession, LoginResponse } from '../../types';

const SESSION_KEY = 'eaf-web-session';
const REFRESH_LEAD_TIME_MS = 60_000;

type SessionListener = (session: AuthSession) => void;

let inMemorySession: AuthSession = readStoredSession();
let refreshPromise: Promise<AuthSession> | null = null;
let refreshTimeoutId: number | null = null;
const listeners = new Set<SessionListener>();

function readStoredSession(): AuthSession {
  window.sessionStorage.removeItem(SESSION_KEY);
  const raw = window.localStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function notify(session: AuthSession) {
  listeners.forEach((listener) => listener(session));
}

function clearRefreshSchedule() {
  if (refreshTimeoutId !== null) {
    window.clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
}

function decodeJwtExpiry(accessToken: string): number | null {
  try {
    const [, payloadSegment] = accessToken.split('.');

    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = window.atob(padded);
    const payload = JSON.parse(decoded) as { exp?: unknown };

    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function scheduleRefresh(session: AuthSession) {
  clearRefreshSchedule();

  if (!session?.accessToken || !session.refreshToken) {
    return;
  }

  const expiryAt = decodeJwtExpiry(session.accessToken);

  if (!expiryAt) {
    return;
  }

  const delayMs = Math.max(expiryAt - Date.now() - REFRESH_LEAD_TIME_MS, 0);

  refreshTimeoutId = window.setTimeout(() => {
    void refreshSession().catch(() => {
      // Session cleanup is already handled inside refreshSession.
    });
  }, delayMs);
}

function persistSession(session: AuthSession) {
  inMemorySession = session;

  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  scheduleRefresh(session);
  notify(session);
}

async function parseAuthResponse(response: Response): Promise<LoginResponse> {
  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : response.statusText;
    throw new Error(message || 'Auth request failed');
  }

  return payload as LoginResponse;
}

export function getSession() {
  return inMemorySession;
}

export function setSession(session: AuthSession) {
  persistSession(session);
}

export function clearSession() {
  persistSession(null);
}

export function subscribeToSession(listener: SessionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function ensureSessionRefreshSchedule() {
  scheduleRefresh(getSession());
}

export async function refreshSession(): Promise<AuthSession> {
  const currentSession = getSession();

  if (!currentSession?.refreshToken) {
    clearSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: currentSession.refreshToken,
          }),
        });

        const nextSession = await parseAuthResponse(response);
        setSession(nextSession);
        return nextSession;
      } catch (error) {
        clearSession();
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}
