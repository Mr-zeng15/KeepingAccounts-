const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Module = require('module');

function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = new Module(filePath, module);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  mod._compile(output, filePath);
  return mod.exports;
}

const { parseChineseDate, resolveTransactionDate } = loadTsModule(
  path.join(__dirname, '..', 'src', 'utils', 'dateParser.ts')
);

const base = '2026-06-18';
const cases = [
  ['昨天吃饭35', '2026-06-17'],
  ['前天打车20', '2026-06-16'],
  ['3天前买菜12', '2026-06-15'],
  ['上周五奶茶18', '2026-06-12'],
  ['这周一午饭30', '2026-06-15'],
  ['6月1日房租2000', '2026-06-01'],
  ['2025年12月31日奖金1000', '2025-12-31'],
  ['这个月3号电费80', '2026-06-03'],
];

for (const [text, expected] of cases) {
  const actual = parseChineseDate(text, base);
  if (actual !== expected) {
    throw new Error(`${text}: expected ${expected}, got ${actual}`);
  }
}

const resolved = resolveTransactionDate('昨天午饭35', undefined, base);
if (resolved !== '2026-06-17') {
  throw new Error(`resolveTransactionDate failed: ${resolved}`);
}

console.log('date parser checks passed');
