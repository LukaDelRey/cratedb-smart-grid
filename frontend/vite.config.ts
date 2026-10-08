import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sourceRoot = fileURLToPath(new URL('./src', import.meta.url));

const componentScopes: Record<string, string> = JSON.parse(
  readFileSync(new URL('./src/styles/component-scopes.json', import.meta.url), 'utf8'),
);

export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls,
        compilerOptions: {
          // Keep scope attributes on hoisted HTML as well as runtime VNodes.
          // The styles themselves live in the shared component stylesheet.
          nodeTransforms: [
            (node, context) => {
              if (node.type !== 1 || node.tagType !== 0) return;

              const filename = path.relative(sourceRoot, context.filename).replaceAll('\\', '/');

              const scope = componentScopes[filename];

              if (scope)
                node.props.push({
                  type: 6,
                  name: scope,
                  nameLoc: node.loc,
                  value: undefined,
                  loc: node.loc,
                });
            },
          ],
        },
      },
    }),
    quasar(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'maps',
              test: /node_modules[\\/](mapbox-gl|@deck\.gl|leaflet|@vue-leaflet)/,
              priority: 30,
              maxSize: 450000,
            },
            {
              name: 'charts',
              test: /node_modules[\\/](echarts|vue-echarts)/,
              priority: 20,
            },
            {
              name: 'ui',
              test: /node_modules[\\/](quasar|@quasar)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
