import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'websocket/index': 'src/websocket/index.ts',
  },
  tsconfig: 'tsconfig.build.json',
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // `centrifuge` is an optional peer dependency used only by `nobitex.js/websocket`.
  external: ['centrifuge'],
});
