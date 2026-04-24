import { ParseZipResponse, SessionRecord, SessionSnapshot } from './types';

const API_URL = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000';

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export async function parseZip(base64Zip: string): Promise<ParseZipResponse> {
  if (typeof window !== 'undefined') {
    const isProdLikeHost = !isLocalhostHost(window.location.hostname);
    if (!import.meta.env.VITE_API_URL && isProdLikeHost) {
      console.warn('[bashcash] VITE_API_URL is not set; using localhost fallback', {
        apiUrl: API_URL,
        pageOrigin: window.location.origin,
      });
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${API_URL}/v1/vfs/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zip_base64: base64Zip }),
      signal: controller.signal,
    });

    const requestId = res.headers.get('x-request-id') || undefined;

    if (!res.ok) {
      const responseText = await res.text();
      let message = responseText || 'Failed to parse ZIP';

      try {
        const parsed = JSON.parse(responseText) as { message?: string; error?: string; request_id?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep plain text response as-is when body is not JSON.
      }

      const withRequestId = requestId ? `${message} (request_id: ${requestId})` : message;
      console.error('[bashcash] parseZip HTTP error', {
        apiUrl: API_URL,
        status: res.status,
        statusText: res.statusText,
        requestId,
        responseText,
      });
      throw new Error(withRequestId);
    }

    return (await res.json()) as ParseZipResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[bashcash] parseZip timeout', { apiUrl: API_URL, timeoutMs: 20000 });
      throw new Error('Request timed out while parsing ZIP. Please try again.');
    }

    if (error instanceof TypeError) {
      console.error('[bashcash] parseZip network/CORS error', {
        apiUrl: API_URL,
        pageOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
        message: error.message,
      });
      throw new Error(
        'Could not reach the API (network/CORS issue). Open DevTools console for details and verify VITE_API_URL.',
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

interface RequestJsonOptions {
  requestLabel: string;
  timeoutMessage: string;
  networkMessage: string;
  notFoundReturnsNull?: boolean;
  timeoutMs?: number;
}

async function requestJson<T>(path: string, init: RequestInit, options: RequestJsonOptions): Promise<T | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const requestId = res.headers.get('x-request-id') || undefined;

    if (options.notFoundReturnsNull && res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const responseText = await res.text();
      let message = responseText || 'Request failed';

      try {
        const parsed = JSON.parse(responseText) as { message?: string; error?: string; request_id?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep plain text response as-is when body is not JSON.
      }

      const withRequestId = requestId ? `${message} (request_id: ${requestId})` : message;
      console.error(`[bashcash] ${options.requestLabel} HTTP error`, {
        apiUrl: API_URL,
        status: res.status,
        statusText: res.statusText,
        requestId,
        responseText,
      });
      throw new Error(withRequestId);
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`[bashcash] ${options.requestLabel} timeout`, { apiUrl: API_URL, timeoutMs: options.timeoutMs ?? 20000 });
      throw new Error(options.timeoutMessage);
    }

    if (error instanceof TypeError) {
      console.error(`[bashcash] ${options.requestLabel} network/CORS error`, {
        apiUrl: API_URL,
        pageOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
        message: error.message,
      });
      throw new Error(options.networkMessage);
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  return (await requestJson<SessionRecord>(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
  }, {
    requestLabel: 'getSession',
    timeoutMessage: 'Request timed out while loading the session. Please try again.',
    networkMessage: 'Could not reach the API while loading the session. Open DevTools console for details and verify VITE_API_URL.',
    notFoundReturnsNull: true,
  })) as SessionRecord | null;
}

export async function saveSession(sessionId: string, snapshot: SessionSnapshot): Promise<SessionRecord> {
  return (await requestJson<SessionRecord>(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  }, {
    requestLabel: 'saveSession',
    timeoutMessage: 'Request timed out while saving the session. Please try again.',
    networkMessage: 'Could not reach the API while saving the session. Open DevTools console for details and verify VITE_API_URL.',
  })) as SessionRecord;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${API_URL}/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      signal: controller.signal,
    });

    const requestId = res.headers.get('x-request-id') || undefined;
    if (!res.ok) {
      const responseText = await res.text();
      let message = responseText || 'Failed to delete session';

      try {
        const parsed = JSON.parse(responseText) as { message?: string; error?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        // Keep plain text response as-is when body is not JSON.
      }

      const withRequestId = requestId ? `${message} (request_id: ${requestId})` : message;
      throw new Error(withRequestId);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out while deleting the session. Please try again.');
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Could not reach the API while deleting the session. Open DevTools console for details and verify VITE_API_URL.',
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

