import * as vite from 'vite';
import * as path from 'path';
import * as babel from '@babel/core';
import * as fs from 'fs/promises';
import typescriptPreset from '@babel/preset-typescript';
import solidtudeBabelPlugin from 'babel-plugin-solidtude';
import { outputFile } from './fs';

async function createClientEntrypoint(
  source: string,
  id: string,
  target: string,
) {
  const targetDir = path.join(process.cwd(), target, id);
  const targetFile = path.join(targetDir, 'index.tsx');
  const relativePath = path.relative(targetDir, source);

  await outputFile(targetFile, `import { insert } from 'solid-js/web';
import { createRoot } from 'solid-js';
import Comp from '${relativePath}';

export default function (id, props) {
  return createRoot((cleanup) => {
    const marker = document.querySelector(\`[data-ssc="\${id}"]\`);
    insert(marker.parentNode, () => <Comp {...props} />, marker);
    return cleanup;
  });
}
  `);

  return targetFile;
}

export default function solidtudePlugin(): vite.Plugin {
  const entries = new Map<string, string>();
  const filenames = new Map<string, string>();

  function createEntry(entry: string): string {
    const result = entries.get(entry);
    if (result) {
      return result;
    }
    const id = `${entries.size}`;
    entries.set(entry, id);
    return id;
  }

  return {
    name: 'solidtude',
    resolveId(source, importer) {
      if (/\.[tj]sx?$/.test(source) && importer) {
        return path.join(path.dirname(importer), source);
      }
      return null;
    },
    async load(id, options) {
      if (id.startsWith('\0')) {
        return null;
      }
      if (/\.client\.[tj]sx?$/.test(id)) {
        if (options?.ssr) {
          let filename = filenames.get(id);
          if (!filename) {
            const entry = createEntry(id);
            await createClientEntrypoint(
              id,
              entry,
              './.solidtude',
            );
            filename = `/.solidtude/${entry}/index.tsx`;
            filenames.set(id, filename);
          }
          return `export default '${filename}';`;
        }
        return null;
      }
      if (/\.[tj]sx?$/.test(id) && options?.ssr) {
        const source = await fs.readFile(id, { encoding: 'utf-8' });

        const { name, ext } = path.parse(id);
        const filename = name + ext;

        const result = await babel.transformAsync(source, {
          presets: [
            [typescriptPreset],
          ],
          plugins: [
            [solidtudeBabelPlugin],
          ],
          filename,
          sourceMaps: 'inline',
        });

        return {
          code: result?.code ?? '',
          map: result?.map,
        };
      }
      return null;
    },
  };
}
