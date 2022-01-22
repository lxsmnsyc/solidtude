import * as esbuild from 'esbuild';
import { nanoid } from 'nanoid';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as babel from '@babel/core';
import solidPlugin from 'babel-preset-solid';
import typescriptPlugin from '@babel/preset-typescript';
import { outputFile, removeFile } from './fs';
import serverComponentsBabelPlugin from './sc-babel';

interface ServerComponentsPlugin {
  assets: string;
  entrypoints: Map<string, string>;
}

function serverComponentsPlugin(options: ServerComponentsPlugin): esbuild.Plugin {
  return {
    name: 'server-components',
    setup(build) {
      build.onLoad(
        { filter: /\.[tj]sx?$/ },
        async (args) => {
          if (/client\.[tj]sx?$/.test(args.path)) {
            const id = options.entrypoints.get(args.path) ?? nanoid();
            options.entrypoints.set(args.path, id);
            return {
              contents: `${options.assets}/${id}.js`,
              loader: 'text',
            };
          }
          const source = await fs.readFile(args.path, { encoding: 'utf-8' });

          const { name, ext } = path.parse(args.path);
          const filename = name + ext;

          const result = await babel.transformAsync(source, {
            presets: [
              [solidPlugin, { generate: 'ssr' }],
              [typescriptPlugin],
              // ...options.babel.presets,
            ],
            plugins: [
              [serverComponentsBabelPlugin]
              // [solidLabels, { dev: options.dev }],
              // [solidSFC],
              // ...options.babel.plugins,
            ],
            filename,
            sourceMaps: 'inline',
          });

          if (result) {
            return { contents: result.code ?? '', loader: 'js' };
          }
          throw new Error('[rigidity:solid] Babel Transform returned null.');
        },
      );
    },
  }
}


function clientComponentsPlugin(): esbuild.Plugin {
  return {
    name: 'client-components',
    setup(build) {
      build.onLoad(
        { filter: /\.[tj]sx?$/ },
        async (args) => {
          const source = await fs.readFile(args.path, { encoding: 'utf-8' });

          const { name, ext } = path.parse(args.path);
          const filename = name + ext;

          const result = await babel.transformAsync(source, {
            presets: [
              [solidPlugin, { generate: 'dom' }],
              [typescriptPlugin],
              // ...options.babel.presets,
            ],
            // plugins: [
            //   // [solidLabels, { dev: options.dev }],
            //   // [solidSFC],
            //   // ...options.babel.plugins,
            // ],
            filename,
            sourceMaps: 'inline',
          });

          if (result) {
            return { contents: result.code ?? '', loader: 'js' };
          }
          throw new Error('[rigidity:solid] Babel Transform returned null.');
        },
      );
    },
  }
}

async function createClientEntrypoint(
  source: string,
  id: string,
  target: string,
) {
  const targetDir = path.join(process.cwd(), target, id);
  const targetFile = path.join(targetDir, 'index.tsx');
  const relativePath = path.relative(targetDir, source);

  await outputFile(targetFile, `
    import { insert } from 'solid-js/web';
    import Comp from '${relativePath}';

    export default function (id, props) {
      const marker = document.querySelector(\`[data-ssc="\${id}"]\`);
      insert(marker.parentNode, () => <Comp {...props} />, marker);
    }
  `);
}

export interface BuildOptions {
  dev: boolean;
  entrypoint: string;
}

export async function build(options: BuildOptions) {
  await removeFile('./dist');

  const entrypoints = new Map<string, string>();

  await esbuild.build({
    bundle: true,
    entryPoints: [options.entrypoint],
    outdir: './dist/server',
    target: [
      'es2017',
      'node12',
    ],
    format: 'cjs',
    platform: 'node',
    conditions: ['solid'],
    plugins: [
      serverComponentsPlugin({ assets: '/assets', entrypoints })
    ],
  });

  const entries = Array.from(entrypoints);
  await Promise.all(entries.map(([source, id]) => createClientEntrypoint(
    source,
    id,
    './dist/.client',
  )));
  await esbuild.build({
    bundle: true,
    splitting: true,
    outdir: './dist/client',
    entryPoints: Object.fromEntries(
      entries.map(([, id]) => [
        id,
        path.join(process.cwd(), './dist/.client', id, 'index.tsx')
      ])
    ),
    publicPath: '/assets',
    platform: 'browser',
    format: 'esm',
    conditions: ['solid'],
    plugins: [
      clientComponentsPlugin(),
    ],
  });
  await removeFile('./dist/.client');
}