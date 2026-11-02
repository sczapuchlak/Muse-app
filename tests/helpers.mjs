import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const require = createRequire(import.meta.url);
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
// Use the project's TypeScript compiler for dependency-free Node/SSR checks.
export function load(relative, fresh = false) {
  let file = resolve(root, relative);
  file = [file, `${file}.ts`, `${file}.tsx`].find(existsSync);
  assert.ok(file, relative);
  if (!fresh && cache.has(file)) return cache.get(file).exports;
  const loadedModule = { exports: {} };
  cache.set(file, loadedModule);
  if(file.endsWith('.json')){loadedModule.exports=JSON.parse(readFileSync(file,'utf8'));return loadedModule.exports;}
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => id.endsWith('.css') ? {} : id.startsWith('.') ? load(resolve(dirname(file), id)) : id.startsWith('@/') ? load(id.slice(2)) : require(id);
  new Function('require', 'module', 'exports', output)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

