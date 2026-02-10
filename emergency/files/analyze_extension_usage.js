#!/usr/bin/env node

/**
 * Extension File Usage Analyzer
 * Детектира:
 * - Orphaned files (файлове без импорти)
 * - Dead code (декларирани но неизползвани)
 * - Missing files (референции към несъществуващи файлове)
 * - Entry points (manifest.json, service-worker.ts)
 */

const fs = require('fs');
const path = require('path');

// Предполагаме че ExtensionGraph.json е в текущата директория
const graphPath = '/mnt/user-data/uploads/ExtensionGraph.json';

if (!fs.existsSync(graphPath)) {
  console.error('❌ ExtensionGraph.json не е намерен!');
  process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

console.log('🔍 Extension File Usage Analysis\n');
console.log('='.repeat(80));

// 1. Извличаме всички файлове от графа
const allFiles = new Map();
const importGraph = new Map(); // file -> [imported by]
const exportGraph = new Map(); // file -> [exports to]

graph.nodes.forEach(node => {
  allFiles.set(node.id, {
    type: node.type,
    status: node.status,
    responsibility: node.responsibility,
    imports: node.imports_from_packages || [],
    public_api: node.public_api || [],
    side_effects: node.side_effects || [],
    importedBy: [],
    exportsTo: []
  });
});

// 2. Намираме entry points (файлове декларирани в manifest)
const entryPoints = new Set([
  'apps/extension/src/background/service-worker.ts',
  'apps/extension/manifest.json'
]);

// Добавяме всички content scripts като entry points
graph.nodes
  .filter(n => n.type === 'content_script')
  .forEach(n => entryPoints.add(n.id));

console.log('\n📌 ENTRY POINTS (' + entryPoints.size + ')');
console.log('-'.repeat(80));
entryPoints.forEach(ep => {
  const node = allFiles.get(ep);
  if (node) {
    console.log(`✓ ${ep}`);
    console.log(`  Type: ${node.type}`);
    console.log(`  Status: ${node.status}`);
  } else {
    console.log(`✗ ${ep} (ЛИПСВА В ГРАФА!)`);
  }
});

// 3. Анализираме зависимостите
console.log('\n\n🔗 DEPENDENCY ANALYSIS');
console.log('-'.repeat(80));

// Групираме по тип
const byType = new Map();
graph.nodes.forEach(node => {
  if (!byType.has(node.type)) {
    byType.set(node.type, []);
  }
  byType.get(node.type).push(node.id);
});

console.log('\n📊 Файлове по тип:');
for (const [type, files] of byType.entries()) {
  console.log(`  ${type.padEnd(25)} : ${files.length} файла`);
}

// 4. Намираме файлове БЕЗ публичен API (потенциални orphans)
console.log('\n\n⚠️  ФАЙЛОВЕ БЕЗ PUBLIC API (Потенциално неизползвани)');
console.log('-'.repeat(80));

const noPublicApi = graph.nodes.filter(n => 
  n.type !== 'configuration' &&
  n.type !== 'test_file' &&
  n.type !== 'stylesheet' &&
  n.type !== 'documentation' &&
  (!n.public_api || n.public_api.length === 0)
);

if (noPublicApi.length === 0) {
  console.log('✓ Всички функционални файлове имат публичен API');
} else {
  noPublicApi.forEach(node => {
    console.log(`\n❓ ${node.id}`);
    console.log(`   Type: ${node.type}`);
    console.log(`   Side effects: ${node.side_effects?.join(', ') || 'none'}`);
    
    // Ако има side effects, вероятно се изпълнява за своите странични ефекти
    if (node.side_effects && node.side_effects.length > 0) {
      console.log('   ✓ Вероятно се изпълнява за странични ефекти');
    } else {
      console.log('   ⚠️  ПОТЕНЦИАЛЕН DEAD CODE');
    }
  });
}

// 5. Търсим MISSING FILES (споменати в imports но липсващи като nodes)
console.log('\n\n🔴 MISSING FILES');
console.log('-'.repeat(80));

const allNodeIds = new Set(graph.nodes.map(n => n.id));
const missingRefs = new Set();

graph.nodes.forEach(node => {
  // Проверяваме imports_from_packages за вътрешни референции
  // (филтрираме @brainbox/* импорти)
  const internalImports = (node.imports_from_packages || [])
    .filter(imp => !imp.startsWith('@brainbox/'));
  
  // За сега само показваме external package imports
  if (node.imports_from_packages && node.imports_from_packages.length > 0) {
    const external = node.imports_from_packages.filter(imp => 
      imp.startsWith('@brainbox/')
    );
    if (external.length > 0) {
      // Това е нормално - импорти от monorepo packages
    }
  }
});

console.log('ℹ️  За точен анализ на missing files е необходим AST parsing');

// 6. Test Coverage Analysis
console.log('\n\n🧪 TEST COVERAGE ANALYSIS');
console.log('-'.repeat(80));

const testFiles = graph.nodes.filter(n => n.type === 'test_file');
const testedModules = new Set();

testFiles.forEach(test => {
  // Извличаме модула който се тества от пътя
  const testPath = test.id;
  const modulePath = testPath
    .replace('/__tests__/', '/')
    .replace('.test.ts', '.ts')
    .replace('.spec.ts', '.ts');
  
  if (allNodeIds.has(modulePath)) {
    testedModules.add(modulePath);
  }
});

const testableFiles = graph.nodes.filter(n => 
  n.type === 'shared_lib' ||
  n.type === 'content_script' ||
  n.type === 'communication_router'
);

console.log(`Общо test файлове: ${testFiles.length}`);
console.log(`Тествани модули: ${testedModules.size}`);
console.log(`Общо testable файлове: ${testableFiles.length}`);
console.log(`Test coverage: ${((testedModules.size / testableFiles.length) * 100).toFixed(1)}%`);

const untestedModules = testableFiles.filter(f => !testedModules.has(f.id));

if (untestedModules.length > 0) {
  console.log('\n⚠️  ФАЙЛОВЕ БЕЗ ТЕСТОВЕ:');
  untestedModules.forEach(m => {
    console.log(`  - ${m.id}`);
  });
}

// 7. Platform Adapters Analysis
console.log('\n\n🤖 PLATFORM ADAPTERS');
console.log('-'.repeat(80));

const adapters = graph.nodes.filter(n => 
  n.id.includes('platformAdapters/') && 
  n.id.endsWith('.adapter.ts')
);

console.log(`Регистрирани адаптери: ${adapters.length}`);
adapters.forEach(adapter => {
  const platform = path.basename(adapter.id, '.adapter.ts');
  const hasTest = testFiles.some(t => t.id.includes(platform + '.test.ts'));
  console.log(`  ${hasTest ? '✓' : '✗'} ${platform.padEnd(15)} ${hasTest ? '' : '(БЕЗ ТЕСТ)'}`);
});

// 8. Configuration Files
console.log('\n\n⚙️  CONFIGURATION FILES');
console.log('-'.repeat(80));

const configs = graph.nodes.filter(n => n.type === 'configuration');
configs.forEach(cfg => {
  console.log(`  - ${path.basename(cfg.id)}`);
});

// 9. Side Effects Analysis (files that modify global state)
console.log('\n\n⚡ SIDE EFFECTS ANALYSIS');
console.log('-'.repeat(80));

const sideEffectTypes = new Map();
graph.nodes.forEach(node => {
  if (node.side_effects && node.side_effects.length > 0) {
    node.side_effects.forEach(effect => {
      if (!sideEffectTypes.has(effect)) {
        sideEffectTypes.set(effect, []);
      }
      sideEffectTypes.get(effect).push(node.id);
    });
  }
});

for (const [effect, files] of sideEffectTypes.entries()) {
  console.log(`\n${effect} (${files.length} файла):`);
  files.forEach(f => console.log(`  - ${f}`));
}

// 10. Summary
console.log('\n\n📋 SUMMARY');
console.log('='.repeat(80));
console.log(`Общо файлове в графа: ${graph.nodes.length}`);
console.log(`Entry points: ${entryPoints.size}`);
console.log(`Active status: ${graph.nodes.filter(n => n.status === 'ACTIVE').length}`);
console.log(`Configuration files: ${configs.length}`);
console.log(`Test files: ${testFiles.length}`);
console.log(`Shared libraries: ${graph.nodes.filter(n => n.type === 'shared_lib').length}`);
console.log(`Content scripts: ${graph.nodes.filter(n => n.type === 'content_script').length}`);
console.log(`Platform adapters: ${adapters.length}`);

console.log('\n✅ Анализът приключи!');
console.log('\n💡 NEXT STEPS:');
console.log('   1. Прегледайте файловете БЕЗ PUBLIC API');
console.log('   2. Добавете тестове за нетествани модули');
console.log('   3. Проверете ПОТЕНЦИАЛЕН DEAD CODE маркираните файлове');
console.log('   4. За по-дълбок анализ, използвайте TypeScript AST parser');
