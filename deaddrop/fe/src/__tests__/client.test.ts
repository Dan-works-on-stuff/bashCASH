import { describe, it, expect } from 'vitest';
import { ApiError } from '../api/client';

describe('ApiError', () => {
  it('stores status code and message', () => {
    const err = new ApiError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('ApiError');
  });

  it('is an instance of Error', () => {
    const err = new ApiError('Unauthorized', 401);
    expect(err).toBeInstanceOf(Error);
  });
});
