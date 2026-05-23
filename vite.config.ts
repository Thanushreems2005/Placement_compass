import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    outDir: "dist/client"
<<<<<<< HEAD
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 10000,
        timeout: 10000,
        configure: (proxy) => {
          // Suppress ECONNREFUSED noise during backend startup
          proxy.on('error', (err, _req, res) => {
            if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
              if (res && !res.headersSent && typeof (res as any).writeHead === 'function') {
                (res as any).writeHead(502, { 'Content-Type': 'application/json' });
                (res as any).end(JSON.stringify({ detail: 'Backend starting up, please retry.' }));
              }
            }
          });
        },
      }
    }
=======
>>>>>>> 2bd4070965769526e2d3ed6a503120533cb93ef2
  }
});
