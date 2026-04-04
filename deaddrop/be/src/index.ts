import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secrets } from './routes/secrets.js';
import { errorHandler } from './middleware/error-handler.js';

const app = new Hono()

app.use('*', cors());
app.get('/', (c) => c.json({ message: 'Hello FII Practic 2026!!!!!numabile! ' }));
app.get('/chaos', (c) => {
  throw new Error('Chaos endpoint triggered — this is a deliberate 500');
});
app.route('/secrets', secrets);
app.onError(errorHandler);

export { app };
