#!/usr/bin/env node

/**
 * Deep File System + Import Analysis
 * Сравнява ExtensionGraph.json с реалната файлова система
 */

const fs = require('fs');
const path = require('path');

const EXTENSION_ROOT = '/mnt/user-data/uploads'; // Adjust if needed
const GRAPH_PATH = '/mnt/user-data/uploads/ExtensionGraph.json';

if (!fs.existsSync(GRAPH_PATH)) {
  console.error('❌ ExtensionGraph.json не е намерен!');
  process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

console.log('🔍 DEEP FILE SYSTEM ANALYSIS\n');
console.log('='.repeat(80));

// Функция за рекурсивно обхождане на директории
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      // Пропускаме node_modules, dist, build и скрити директории
      if (!file.startsWith('.') && 
          file !== 'node_modules' && 
          file !== 'dist' && 
          file !== 'build' &&
          file !== 'coverage') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Функция за извличане на импорти от TypeScript/JavaScript файл
function extractImports(filePath) {
  if (!fs.existsSync(filePath)) return [];
  
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  
  // Regex за различни типове импорти
  const patterns = [
    /import\s+.*?\s+from\s+['"](.+?)['"]/g,           // import X from 'Y'
    /import\s+['"](.+?)['"]/g,                        // import 'Y'
    /require\s*\(\s*['"](.+?)['"]\s*\)/g,            // require('Y')
    /import\s*\(\s*['"](.+?)['"]\s*\)/g,             // dynamic import('Y')
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
  });
  
  return [...new Set(imports)]; // Remove duplicates
}

// 1. Намираме всички файлове в extension директорията
console.log('\n📁 SCANNING FILE SYSTEM...');

// Опитваме различни възможни пътища
const possibleRoots = [
  '/mnt/user-data/uploads/apps/extension',
  './apps/extension',
  '../apps/extension'
];

let extensionRoot = null;
for (const root of possibleRoots) {
  if (fs.existsSync(root)) {
    extensionRoot = root;
    break;
  }
}

if (!extensionRoot) {
  console.log('⚠️  Extension директорията не е намерена в качените файлове');
  console.log('   Анализът ще продължи само с ExtensionGraph.json данни\n');
  
  // Продължаваме с алтернативен анализ базиран само на графа
  console.log('📊 GRAPH-ONLY ANALYSIS');
  console.log('-'.repeat(80));
  
  const allPaths = graph.nodes.map(n => n.id);
  const uniqueDirectories = new Set();
  
  allPaths.forEach(p => {
    const dir = path.dirname(p);
    uniqueDirectories.add(dir);
  });
  
  console.log(`\nДекларирани директории в графа: ${uniqueDirectories.size}`);
  
  const dirTree = {};
  allPaths.forEach(p => {
    const parts = p.split('/');
    let current = dirTree;
    parts.forEach(part => {
      if (!current[part]) current[part] = {};
      current = current[part];
    });
  });
  
  function printTree(tree, prefix = '', isLast = true) {
    const keys = Object.keys(tree);
    keys.forEach((key, index) => {
      const isLastItem = index === keys.length - 1;
      const connector = isLastItem ? '└── ' : '├── ';
      const extension = prefix + connector + key;
      
      console.log(extension);
      
      if (Object.keys(tree[key]).length > 0) {
        const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
        printTree(tree[key], newPrefix, isLastItem);
      }
    });
  }
  
  console.log('\n🌳 FILE TREE (от граф):');
  printTree(dirTree);
  
} else {
  console.log(`✓ Намерена extension директория: ${extensionRoot}\n`);
  
  const allFiles = getAllFiles(extensionRoot);
  const sourceFiles = allFiles.filter(f => 
    f.endsWith('.ts') || 
    f.endsWith('.tsx') || 
    f.endsWith('.js') || 
    f.endsWith('.jsx')
  );
  
  console.log(`Общо файлове: ${allFiles.length}`);
  console.log(`TypeScript/JavaScript файлове: ${sourceFiles.length}\n`);
  
  // 2. Сравняваме с графа
  console.log('🔄 COMPARING WITH GRAPH');
  console.log('-'.repeat(80));
  
  const graphFiles = new Set(graph.nodes.map(n => n.id));
  const actualFiles = new Set(sourceFiles.map(f => 
    f.replace(extensionRoot + '/', 'apps/extension/')
  ));
  
  // Файлове в графа но НЕ на диска
  const missingOnDisk = [...graphFiles].filter(f => 
    !actualFiles.has(f) && 
    (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'))
  );
  
  // Файлове на диска но НЕ в графа
  const missingInGraph = [...actualFiles].filter(f => !graphFiles.has(f));
  
  if (missingOnDisk.length > 0) {
    console.log('\n🔴 ФАЙЛОВЕ В ГРАФА НО ЛИПСВАЩИ НА ДИСКА:');
    missingOnDisk.forEach(f => console.log(`  ✗ ${f}`));
  } else {
    console.log('\n✓ Всички файлове от графа съществуват на диска');
  }
  
  if (missingInGraph.length > 0) {
    console.log('\n🟡 ФАЙЛОВЕ НА ДИСКА НО ЛИПСВАЩИ В ГРАФА:');
    missingInGraph.forEach(f => console.log(`  ? ${f}`));
  } else {
    console.log('\n✓ Всички файлове от диска са в графа');
  }
  
  // 3. Анализ на импортите
  console.log('\n\n📦 IMPORT ANALYSIS');
  console.log('-'.repeat(80));
  
  const importGraph = new Map();
  
  sourceFiles.forEach(file => {
    const imports = extractImports(file);
    const normalizedPath = file.replace(extensionRoot + '/', 'apps/extension/');
    importGraph.set(normalizedPath, imports);
  });
  
  // Намираме файлове които не се импортират никъде
  const importedFiles = new Set();
  importGraph.forEach((imports, file) => {
    imports.forEach(imp => {
      // Пропускаме external packages
      if (!imp.startsWith('.') && !imp.startsWith('@/')) return;
      
      // Resolve relative imports
      const dir = path.dirname(file);
      let resolved = imp.startsWith('@/') 
        ? imp.replace('@/', 'apps/extension/src/')
        : path.join(dir, imp);
      
      // Добавяме разширения ако липсват
      if (!resolved.endsWith('.ts') && !resolved.endsWith('.tsx')) {
        if (fs.existsSync(resolved + '.ts')) {
          resolved += '.ts';
        } else if (fs.existsSync(resolved + '.tsx')) {
          resolved += '.tsx';
        } else if (fs.existsSync(resolved + '/index.ts')) {
          resolved += '/index.ts';
        } else if (fs.existsSync(resolved + '/index.tsx')) {
          resolved += '/index.tsx';
        }
      }
      
      importedFiles.add(resolved);
    });
  });
  
  const neverImported = [...actualFiles].filter(f => 
    !importedFiles.has(f) &&
    !f.endsWith('.d.ts') && // Type definitions
    !f.includes('__tests__') && // Test files
    !f.includes('.test.') &&
    !f.includes('.spec.') &&
    f !== 'apps/extension/src/background/service-worker.ts' && // Entry points
    !f.includes('/popup/index.tsx') &&
    !f.includes('manifest.json') &&
    !f.includes('config')
  );
  
  if (neverImported.length > 0) {
    console.log('\n⚠️  ФАЙЛОВЕ КОИТО НИКЪДЕ НЕ СЕ ИМПОРТИРАТ (Orphans):');
    neverImported.forEach(f => {
      console.log(`  🔸 ${f}`);
      
      // Проверяваме дали имат експорти
      const content = fs.readFileSync(
        f.replace('apps/extension/', extensionRoot + '/'), 
        'utf8'
      );
      const hasExports = /export\s+(default|const|function|class|interface|type)/.test(content);
      
      if (hasExports) {
        console.log(`     ℹ️  Има експорти но не се използва`);
      } else {
        console.log(`     ℹ️  Вероятно side-effect файл`);
      }
    });
  } else {
    console.log('\n✓ Няма orphan файлове');
  }
  
  // 4. Топ импортирани файлове
  console.log('\n\n🔥 НАЙ-ИМПОРТИРАНИ ФАЙЛОВЕ (Top 10):');
  console.log('-'.repeat(80));
  
  const importCounts = new Map();
  importedFiles.forEach(file => {
    importCounts.set(file, (importCounts.get(file) || 0) + 1);
  });
  
  const topImports = [...importCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  topImports.forEach(([file, count]) => {
    console.log(`  ${count.toString().padStart(3)}x  ${file}`);
  });
}

// 5. Анализ на типове файлове от графа
console.log('\n\n📊 FILE TYPE DISTRIBUTION (от граф):');
console.log('-'.repeat(80));

const typeStats = new Map();
graph.nodes.forEach(node => {
  const count = typeStats.get(node.type) || 0;
  typeStats.set(node.type, count + 1);
});

const sortedTypes = [...typeStats.entries()]
  .sort((a, b) => b[1] - a[1]);

sortedTypes.forEach(([type, count]) => {
  const percentage = ((count / graph.nodes.length) * 100).toFixed(1);
  const bar = '█'.repeat(Math.floor(count / 2));
  console.log(`  ${type.padEnd(30)} ${count.toString().padStart(3)} (${percentage}%) ${bar}`);
});

console.log('\n✅ Анализът завърши!');
