import { API_ROUTES } from '@/src/shared/constants/routes.constants';

/**
 * Fetch wrapper that automatically handles 401 responses by refreshing
 * the auth token and retrying the request once.
 *
 * Solves the race condition where page fetches fire before the auth
 * provider has finished refreshing an expired token.
 */

let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(API_ROUTES.AUTH_REFRESH, { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetch(input, init);
    }
  }

  return res;
}
