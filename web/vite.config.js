import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serves /api/* from the same files Vercel deploys as serverless functions,
 * so `npm run dev` behaves like production (no Vercel CLI needed locally).
 */
function localApi() {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (!url.pathname.startsWith('/api/') || url.pathname.includes('/_')) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${url.pathname.slice(5)}.js`);
          let raw = '';
          for await (const chunk of req) raw += chunk;
          req.body = raw ? JSON.parse(raw) : undefined;
          res.status = (code) => ((res.statusCode = code), res);
          res.json = (obj) => {
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(obj));
          };
          await mod.default(req, res);
        } catch (err) {
          if (err.code === 'ERR_LOAD_URL' || /Failed to load url/.test(err.message)) return next();
          console.error(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ message: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-side env (ANTHROPIC_API_KEY, DEMO_PASSWORD) to the local API only.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), localApi()] };
});
