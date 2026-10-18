import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

function downloadProxyPlugin(): Plugin {
  return {
    name: 'download-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/download')) {
          const parsedUrl = new URL(req.url, 'http://localhost:3000');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }
          try {
            const upstream = await fetch(targetUrl, { redirect: 'follow' });
            res.statusCode = upstream.status;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'application/octet-stream');
            const cl = upstream.headers.get('content-length');
            if (cl) res.setHeader('Content-Length', cl);

            if (upstream.body) {
              const reader = upstream.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) res.write(Buffer.from(value));
              }
            }
            res.end();
          } catch (err: any) {
            res.statusCode = 500;
            res.end(err.message);
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), downloadProxyPlugin()],
  server: {
    port: 3000,
  },
});
