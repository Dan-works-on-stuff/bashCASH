import { handle } from 'hono/aws-lambda';
import { app } from '../src/index.js';

export const handler = handle(app);
