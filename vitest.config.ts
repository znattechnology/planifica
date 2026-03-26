import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/ai/**/*.ts'],
      exclude: ['**/*.d.ts', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/application': path.resolve(__dirname, 'src/application'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/ui': path.resolve(__dirname, 'src/ui'),
      '@/ai': path.resolve(__dirname, 'src/ai'),
      '@/config': path.resolve(__dirname, 'src/config'),
    },
  },
});
