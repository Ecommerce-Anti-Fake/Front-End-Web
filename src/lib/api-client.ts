import { clearSession, getSession, refreshSession } from '../modules/auth/auth-session';
import type { ApiRequestOptions } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3001/api';

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : response.statusText;
    throw new Error(message || 'Request failed');
  }

  return payload;
}

async function sendRequest(path: string, { method = 'GET', body, accessToken }: ApiRequestOptions = {}) {
  const headers = new Headers();

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, accessToken }: ApiRequestOptions = {},
): Promise<T> {
  const session = getSession();
  const effectiveAccessToken = accessToken ?? session?.accessToken ?? undefined;
  let response = await sendRequest(path, {
    method,
    body,
    accessToken: effectiveAccessToken,
  });

  const isAuthEndpoint =
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh');

  if (response.status === 401 && !isAuthEndpoint && session?.refreshToken) {
    try {
      const refreshedSession = await refreshSession();

      if (refreshedSession?.accessToken) {
        response = await sendRequest(path, {
          method,
          body,
          accessToken: refreshedSession.accessToken,
        });
      }
    } catch {
      clearSession();
    }
  }

  return parseResponse(response) as Promise<T>;
}

export { API_BASE_URL };
