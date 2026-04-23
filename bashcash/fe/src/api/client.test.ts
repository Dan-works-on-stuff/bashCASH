import { parseZip } from './client';

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
        children: [],
      },
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseBody),
      headers: { get: vi.fn().mockReturnValue(null) },
    } as unknown as Response);

    const result = await parseZip('abc123');

    expect(result).toEqual(responseBody);
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
});
