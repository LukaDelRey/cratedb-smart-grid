import { createRequire } from 'node:module';

const requireFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));

const ts = requireFrontend('typescript');

const { parse: parseSfc } = requireFrontend('@vue/compiler-sfc');

const { parse: parseTemplate } = requireFrontend('@vue/compiler-dom');

function applyEdits(source, edits) {
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }

  return source;
}

export function spaceCode(source, filename = 'source.ts') {
  let ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);

  const declarations = [];

  function split(node) {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.length > 1) {
      const items = node.declarationList.declarations;

      const prefix = source.slice(node.getStart(ast), items[0].getStart(ast));

      // A declaration may have comments attached to its comma. Preserve those
      // groups rather than dropping or moving a comment while splitting them.
      const hasComments = items
        .slice(1)
        .some((item, index) =>
          /\/\/|\/\*/.test(source.slice(items[index].end, item.getStart(ast))),
        );

      if (!hasComments) {
        declarations.push({
          start: node.getStart(ast),
          end: node.end,
          text: items.map((item) => `${prefix}${item.getText(ast)};`).join('\n'),
        });
      }
    }

    ts.forEachChild(node, split);
  }

  do {
    declarations.length = 0;
    split(ast);

    // Apply innermost edits first so nested declarations never overlap an
    // enclosing declaration replacement. Subsequent passes split the parents.
    const innermost = declarations.filter(
      (outer) => !declarations.some((inner) => inner.start > outer.start && inner.end < outer.end),
    );

    source = applyEdits(source, innermost);
    ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  } while (declarations.length);

  const spacing = [];

  function separate(node) {
    if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node)) {
      const statements = node.statements;

      for (let index = 1; index < statements.length; index++) {
        const previous = statements[index - 1];

        const current = statements[index];

        const gap = source.slice(previous.end, current.getStart(ast));

        const importGroup = ts.isImportDeclaration(previous) && ts.isImportDeclaration(current);

        const boundary =
          ts.isSourceFile(node) ||
          !ts.isExpressionStatement(previous) ||
          !ts.isExpressionStatement(current);

        if (!importGroup && boundary && /^\s*$/.test(gap) && gap.includes('\n')) {
          const indent = gap.slice(gap.lastIndexOf('\n') + 1);

          spacing.push({ start: previous.end, end: current.getStart(ast), text: `\n\n${indent}` });
        }
      }
    }

    ts.forEachChild(node, separate);
  }

  separate(ast);

  return applyEdits(source, spacing);
}

export function spaceVue(source) {
  const { descriptor } = parseSfc(source);

  const edits = [];

  for (const block of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
    edits.push({
      start: block.loc.start.offset,
      end: block.loc.end.offset,
      text: spaceCode(block.content),
    });
  }

  if (descriptor.template) {
    const template = descriptor.template;

    const ast = parseTemplate(template.content);

    function separate(node) {
      const children = (node.children || []).filter(
        (child) => child.type !== 2 || child.content.trim(),
      );

      for (let index = 1; index < children.length; index++) {
        const previous = children[index - 1];

        const current = children[index];

        // Only separate element siblings already on different lines. Text and
        // interpolations keep their original spacing and inline relationships.
        if (previous.type !== 1 || current.type !== 1) continue;

        const gap = template.content.slice(previous.loc.end.offset, current.loc.start.offset);

        if (/^\s*$/.test(gap) && gap.includes('\n')) {
          const indent = gap.slice(gap.lastIndexOf('\n') + 1);

          edits.push({
            start: template.loc.start.offset + previous.loc.end.offset,
            end: template.loc.start.offset + current.loc.start.offset,
            text: `\n\n${indent}`,
          });
        }
      }

      for (const child of node.children || []) separate(child);
    }

    separate(ast);
  }

  return applyEdits(source, edits);
}
