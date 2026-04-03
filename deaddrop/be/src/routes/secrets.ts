import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { generateId } from '../services/id.js';
import { kmsEncrypt, kmsDecrypt } from '../services/encryption.js';
import { putSecret, getSecret, markViewed } from '../services/dynamo.js';
import { sendDeleteMessage } from '../services/sqs.js';
import { generateText } from '../services/bedrock.js';
import { AppError } from '../middleware/error-handler.js';

const EXPIRY_MAP: Record<string, number> = {
  '1h': 60 * 60,
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
};

const createSchema = z.object({
  content: z.string().min(1),
  password: z.string().min(1).max(128),
  email: z.string().email(),
  expiresIn: z.enum(['1h', '24h', '7d']),
});

const viewSchema = z.object({
  password: z.string().min(1),
});

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

const secrets = new Hono();

secrets.post(
  '/',
  zValidator('json', createSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.message } },
        400,
      );
    }
  }),
  async (c) => {
    const body = c.req.valid('json');
    const id = generateId();

    const encryptedBlob = await kmsEncrypt(body.content);

    const ttlSeconds = EXPIRY_MAP[body.expiresIn];
    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;
    const expiresAt = new Date(ttl * 1000).toISOString();

    await putSecret({
      id,
      encryptedBlob,
      password: body.password,
      email: body.email,
      ttl,
      createdAt: new Date().toISOString(),
      viewed: false,
    });

    return c.json({ id, expiresAt }, 201);
  },
);

secrets.post(
  '/:id/view',
  zValidator('json', viewSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.message } },
        400,
      );
    }
  }),
  async (c) => {
    const { id } = c.req.param();
    const { password } = c.req.valid('json');

    const secret = await getSecret(id);
    if (!secret || secret.viewed) {
      throw new AppError(404, 'NOT_FOUND', 'Secret not found');
    }

    if (password !== secret.password) {
      throw new AppError(401, 'WRONG_PASSWORD', 'Incorrect password');
    }

    const marked = await markViewed(id);
    if (!marked) {
      throw new AppError(404, 'NOT_FOUND', 'Secret not found');
    }

    const content = await kmsDecrypt(secret.encryptedBlob);

    await sendDeleteMessage(id, secret.email);

    return c.json({ content }, 200);
  },
);

secrets.post(
  '/generate',
  zValidator('json', generateSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.message } },
        400,
      );
    }
  }),
  async (c) => {
    const { prompt } = c.req.valid('json');
    const content = await generateText(prompt);
    return c.json({ content }, 200);
  },
);

export { secrets };
