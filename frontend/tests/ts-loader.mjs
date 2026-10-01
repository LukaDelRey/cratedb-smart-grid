// Use the installed TypeScript compiler to load application modules in Node.
// Only Vite's environment boundary is replaced; application logic stays intact.
import ts from 'typescript'
import { readFile, stat } from 'node:fs/promises'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

export async function resolve(specifier, context, nextResolve) {
  if (['mapbox-gl', 'vue-echarts', '@vue-leaflet/vue-leaflet', '@vue-flow/core', '@vue-flow/background', '@vue-flow/controls'].includes(specifier)) {
    return { url: new URL('./visual-boundaries.mjs', import.meta.url).href, shortCircuit: true }
  }
  if (specifier.startsWith('.') && context.parentURL) {
    const url = new URL(specifier, context.parentURL)
    for (const suffix of ['', '.ts', '/index.ts']) {
      try {
        if ((await stat(new URL(url.href + suffix))).isFile())
          return { url: url.href + suffix, shortCircuit: true }
      } catch {}
    }
  }
  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (/\.(css|png|svg)$/.test(url)) return { format:'module', shortCircuit:true, source:'export default "test-asset"' }
  if (url.endsWith('.vue')) {
    const filename = new URL(url).pathname
    const { descriptor, errors } = parse(await readFile(new URL(url), 'utf8'), { filename })
    if (errors.length) throw errors[0]
    const script = descriptor.script || descriptor.scriptSetup
      ? compileScript(descriptor, { id:filename, genDefaultAs:'__sfc__' })
      : { content:'const __sfc__ = {}', bindings:{} }
    const template = compileTemplate({ source:descriptor.template?.content || '', filename,
      id:filename, compilerOptions:{ bindingMetadata:script.bindings } })
    if(template.errors.length) throw template.errors[0]
    const source = (script.content + '\n' + template.code.replace('export function render','function render')
      + '\n__sfc__.render=render; export default __sfc__').replaceAll('import.meta.env','({})')
    return { format:'module', shortCircuit:true, source:ts.transpileModule(source, {
      compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext }
    }).outputText }
  }
  if (url.endsWith('.ts')) {
    let source = (await readFile(new URL(url), 'utf8')).replaceAll('import.meta.env', '({})')
    if(url.endsWith('/router/index.ts')) source = source.replaceAll('createWebHistory','createMemoryHistory')
    return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText }
  }
  return nextLoad(url, context)
}
