import react from '@vitejs/plugin-react';
import { build as esbuild } from 'esbuild';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import manifest from './src/manifest';

const rootDir = __dirname;
const distDir = resolve(rootDir, 'dist');
const extensionTarget = 'es2019';
const productionDefine = { 'process.env.NODE_ENV': '"production"' };

function extensionBuildPlugin(): Plugin {
  return {
    name: 'zhijuan-extension-build',
    apply: 'build',
    async closeBundle() {
      await esbuild({
        entryPoints: [resolve(rootDir, 'src/background/index.ts')],
        bundle: true,
        outfile: resolve(distDir, 'background.js'),
        format: 'esm',
        target: [extensionTarget],
        define: productionDefine,
        sourcemap: false,
        logLevel: 'silent'
      });

      await esbuild({
        entryPoints: [resolve(rootDir, 'src/content/index.tsx')],
        bundle: true,
        outfile: resolve(distDir, 'content.js'),
        format: 'iife',
        target: [extensionTarget],
        define: productionDefine,
        sourcemap: false,
        jsx: 'automatic',
        loader: {
          '.css': 'text'
        },
        logLevel: 'silent'
      });

      await writeFile(resolve(distDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      await writeExtensionHtml('popup.html', 'Zhijuan Prompt Card', 'popup');
      await writeExtensionHtml('options.html', 'Zhijuan Prompt Card Settings', 'options');
      await rm(resolve(distDir, 'src'), { recursive: true, force: true });
      await copyStaticFile('src/shared/reversePrompt.ts', 'docs/embedded-reverse-prompt-source.ts');
    }
  };
}

async function writeExtensionHtml(fileName: string, title: string, entryName: string) {
  await writeFile(
    resolve(distDir, fileName),
    [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `    <title>${title}</title>`,
      `    <link rel="stylesheet" href="assets/${entryName}.css" />`,
      `    <script type="module" src="assets/${entryName}.js"></script>`,
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '  </body>',
      '</html>',
      ''
    ].join('\n')
  );
}

async function copyStaticFile(from: string, to: string) {
  const target = resolve(distDir, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(rootDir, from), target);
}

export default defineConfig({
  plugins: [react(), extensionBuildPlugin()],
  define: productionDefine,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: extensionTarget,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, 'src/popup/index.html'),
        options: resolve(rootDir, 'src/options/index.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
