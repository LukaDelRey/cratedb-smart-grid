import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { spaceCode, spaceVue } from './readability.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

const requireFrontend = createRequire(path.join(root, 'frontend/package.json'));

const { parse: parseSfc } = requireFrontend('@vue/compiler-sfc');

const { parse: parseTemplate } = requireFrontend('@vue/compiler-dom');

const check = process.argv.includes('--check');

function attributeKey(prop) {
  const name = prop.loc.source.split(/[\s=]/, 1)[0];

  if (name.startsWith('v-') || /^(?::)?model-value$/.test(name)) return [0, name];

  if (name.startsWith(':')) return [2, name.slice(1)];

  if (name.startsWith('@')) return [3, name.slice(1)];

  return [1, name];
}

function sortAttributes(props) {
  return [...props].sort((a, b) => {
    const [groupA, nameA] = attributeKey(a);

    const [groupB, nameB] = attributeKey(b);

    return groupA - groupB || (nameA < nameB ? -1 : nameA > nameB ? 1 : 0);
  });
}

export function orderVueAttributes(source) {
  const { descriptor, errors } = parseSfc(source);
  // The archived GridMap prototype is entirely commented out.
  if (!descriptor.template && !descriptor.script && !descriptor.scriptSetup) return source;

  if (errors.length) throw new Error(errors.map(String).join('\n'));

  if (!descriptor.template) return source;

  const template = descriptor.template;

  const ast = parseTemplate(template.content);

  const edits = [];

  function visit(node) {
    if (node.type === 1) {
      // Object spreads and dynamic arguments may overwrite neighbouring props.
      // Keep their positions and sort only the independent attributes between them.
      let segment = [];

      function flush() {
        if (segment.length > 1) {
          edits.push({
            start: template.loc.start.offset + segment[0].loc.start.offset,
            end: template.loc.start.offset + segment.at(-1).loc.end.offset,
            text: sortAttributes(segment)
              .map((prop) => prop.loc.source)
              .join(' '),
          });
        }

        segment = [];
      }

      for (const prop of node.props) {
        const isBarrier =
          prop.type === 7 &&
          ((['bind', 'on'].includes(prop.name) && !prop.arg) || prop.arg?.isStatic === false);

        if (isBarrier) flush();
        else segment.push(prop);
      }

      flush();
    }

    for (const child of node.children || []) visit(child);
  }

  visit(ast);

  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }

  return source;
}

async function collect(relative) {
  const absolute = path.join(root, relative);

  const entry = await fs.stat(absolute);

  if (!entry.isDirectory()) return [absolute];

  const files = [];

  for (const item of await fs.readdir(absolute, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.style-refactor-backup', 'assets'].includes(item.name)) continue;

    files.push(...(await collect(path.join(relative, item.name))));
  }

  return files;
}

async function main() {
  const inputs = [
    'frontend/src',
    'frontend/vite.config.ts',
    'frontend/index.html',
    'frontend/package.json',
    'frontend/tsconfig.json',
    'frontend/tsconfig.app.json',
    'frontend/tsconfig.node.json',
    'frontend/README.md',
    'package.json',
    '.prettierrc.json',
    'docker-compose.yml',
    'README.md',
    'tools',
  ];

  let changed = 0;

  let total = 0;

  for (const input of inputs) {
    for (const file of await collect(input)) {
      if (!/\.(vue|ts|js|mjs|css|json|html|ya?ml|md)$/.test(file)) continue;

      const source = await fs.readFile(file, 'utf8');

      let ordered = file.endsWith('.vue') ? orderVueAttributes(source) : source;

      if (file.endsWith('.vue')) ordered = spaceVue(ordered);
      else if (/\.(ts|js|mjs)$/.test(file)) ordered = spaceCode(ordered, file);

      const options = await prettier.resolveConfig(file);

      const formatted = await prettier.format(ordered, { ...options, filepath: file });

      total++;

      if (formatted === source) continue;

      changed++;

      if (check) console.error(path.relative(root, file));
      else await fs.writeFile(file, formatted);
    }
  }

  console.log(`${total} files checked; ${changed} ${check ? 'need formatting' : 'formatted'}.`);

  if (check && changed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
