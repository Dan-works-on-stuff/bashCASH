import { ParseZipResponse } from './types';

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
