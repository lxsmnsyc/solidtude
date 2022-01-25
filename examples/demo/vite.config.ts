import * as vite from 'vite';
import solidPlugin from 'vite-plugin-solid';
import solidtudePlugin from 'vite-plugin-solidtude';

export default vite.defineConfig({
  plugins: [
    solidtudePlugin(),
    solidPlugin({
      ssr: true,
    }),
  ],
});