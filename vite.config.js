import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: '/demo.html',
  },
  worker: {
    format: 'es',
    plugins: () => [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'PotreeViewer',
      fileName: (format) => `potree-viewer.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['three', 'potree-core'],
      output: {
        globals: {
          three: 'THREE',
          'potree-core': 'Potree',
        },
      },
    },
  },
});
