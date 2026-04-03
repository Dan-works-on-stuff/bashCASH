import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const createSchema = z.object({
  content: z.string().min(1),
  password: z.string().min(1).max(128),
  email: z.string().email(),
  expiresIn: z.enum(['1h', '24h', '7d']),
});

describe('create secret validation', () => {
  it('accepts valid input', () => {
    const result = createSchema.safeParse({
      content: 'my secret',
      password: 'pass123',
      email: 'test@example.com',
      expiresIn: '24h',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = createSchema.safeParse({
      content: '',
      password: 'pass123',
      email: 'test@example.com',
      expiresIn: '24h',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = createSchema.safeParse({
      content: 'secret',
      password: 'pass123',
      email: 'not-an-email',
      expiresIn: '1h',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid expiry', () => {
    const result = createSchema.safeParse({
      content: 'secret',
      password: 'pass123',
      email: 'test@example.com',
      expiresIn: '30d',
    });
    expect(result.success).toBe(false);
  });
});
