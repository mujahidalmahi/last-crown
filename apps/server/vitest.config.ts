import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
