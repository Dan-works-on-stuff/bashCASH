import { deleteSession, getSession, parseZip, saveSession } from './client';
import type { SessionSnapshot } from './types';

describe('parseZip', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns parsed VFS response on success', async () => {
    const responseBody = {
      vfs: {
        name: '/',
        type: 'directory',
        children: [
          {
            name: 'docs',
            type: 'directory',
            children: [
              {
                name: 'readme.txt',
                type: 'file',
                content: 'hello',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
      headers: { get: vi.fn().mockReturnValue(null) },
    } as unknown as Response);

    const result = await parseZip('abc123');

    expect(result).toEqual(responseBody);
    expect(result.vfs.children?.[0]?.children?.[0]?.content).toBe('hello');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('surfaces backend message and request_id on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: 'invalid_zip',
          message: 'Invalid ZIP payload',
          request_id: 'server-id',
        }),
      ),
      headers: { get: vi.fn().mockReturnValue('abc-request-id') },
    } as unknown as Response);

    await expect(parseZip('abc123')).rejects.toThrow('Invalid ZIP payload (request_id: abc-request-id)');
  });

  it('maps fetch TypeError to network/CORS diagnostic', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(parseZip('abc123')).rejects.toThrow(
      'Could not reach the API (network/CORS issue). Open DevTools console for details and verify VITE_API_URL.',
    );
  });

  it('maps abort to timeout diagnostic', async () => {
    vi.useFakeTimers();

    vi.mocked(fetch).mockImplementation((_input: string | URL | Request, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const pending = parseZip('abc123');
    const expectedRejection = expect(pending).rejects.toThrow(
      'Request timed out while parsing ZIP. Please try again.',
    );

    await vi.advanceTimersByTimeAsync(20000);
    await expectedRejection;
  });

  it('returns null for missing session records', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: vi.fn().mockResolvedValue(''),
      headers: { get: vi.fn().mockReturnValue('session-request-id') },
    } as unknown as Response);

    await expect(getSession('session-1')).resolves.toBeNull();
  });

  it('saves session snapshots and returns the updated record', async () => {
    const snapshot: SessionSnapshot = {
      vfs: {
        name: '/',
        type: 'directory',
        children: [],
      },
      current_path: '/son1',
    };

    const responseBody = {
      session_id: 'session-1',
      ...snapshot,
      updated_at: '2026-04-24T12:00:00Z',
      ttl: 1710000000,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
      headers: { get: vi.fn().mockReturnValue(null) },
    } as unknown as Response);

    const result = await saveSession('session-1', snapshot);

    expect(result).toEqual(responseBody);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('deletes a session successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: vi.fn().mockReturnValue(null) },
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(deleteSession('session-1')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('surfaces 404 for delete session failures', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: 'session_not_found',
          message: 'Session not found',
        }),
      ),
      headers: { get: vi.fn().mockReturnValue('delete-request-id') },
    } as unknown as Response);

    await expect(deleteSession('session-1')).rejects.toThrow('Session not found (request_id: delete-request-id)');
  });
});
