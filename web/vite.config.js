import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';
  return {
    // В режиме standalone собираем один HTML-файл, который открывается без сервера.
    base: './',
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    resolve: {
      alias: { '@shared': `${sharedDir}/src` },
    },
    server: {
      fs: { allow: ['..'] },
    },
    build: {
      outDir: standalone ? 'dist-standalone' : 'dist',
      emptyOutDir: true,
    },
  };
});
