import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => ({ build:{rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),celebration:fileURLToPath(new URL('./prueba-premio.html',import.meta.url))}}}, plugins: [react(), {
  name: 'anvid-local-api',
  apply: 'serve',
  configureServer(server) {
    const env = loadEnv(mode, process.cwd(), 'FIREBASE_');
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) process.env.FIREBASE_SERVICE_ACCOUNT_JSON = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    server.middlewares.use('/api/experience', async (req, res, next) => {
      if (req.url !== '/' && !req.url.startsWith('/?') && !req.url.startsWith('?')) return next();
      try { const { default: handler } = await import('./api/experience.js'); await handler(req, res); }
      catch { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Estamos preparando las tarjetas. Vuelve en un momento.' })); }
    });
  },
}] }));
