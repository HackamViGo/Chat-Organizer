#!/usr/bin/env node
/**
 * Circular Dependency Scan Script
 * Validates that normalizers.js can be safely extracted to shared package
 */

const fs = require('fs');
const path = require('path');

const normalizersPath = path.join(__dirname, '../../extension/lib/normalizers.js');
const schemasPath = path.join(__dirname, '../../extension/lib/schemas.js');

console.log('🔄 Checking for circular dependencies...\n');

const report = {
  circular_deps: [],
  safe_to_extract: [],
  timestamp: new Date().toISOString()
};

// Read normalizers.js
const normalizersContent = fs.readFileSync(normalizersPath, 'utf8');

// Check what normalizers imports
const normalizersImports = [];
const importMatches = normalizersContent.matchAll(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g);
for (const match of importMatches) {
  normalizersImports.push({
    items: match[1].split(',').map(s => s.trim()),
    from: match[2]
  });
}

console.log('normalizers.js imports:');
normalizersImports.forEach(imp => {
  console.log(`  - ${imp.items.join(', ')} from "${imp.from}"`);
});

// Read schemas.js
const schemasContent = fs.readFileSync(schemasPath, 'utf8');

// Check if schemas imports anything from normalizers (would be circular)
const schemasImportsNormalizers = schemasContent.includes('./normalizers') || 
                                   schemasContent.includes('normalizers.js');

if (schemasImportsNormalizers) {
  report.circular_deps.push({
    from: 'schemas.js',
    to: 'normalizers.js',
    severity: 'CRITICAL',
    recommendation: 'Cannot extract to shared package without refactoring'
  });
  console.log('\n❌ CIRCULAR DEPENDENCY DETECTED!');
  console.log('   schemas.js → normalizers.js');
} else {
  console.log('\n✅ NO CIRCULAR DEPENDENCIES');
  console.log('   schemas.js does not import normalizers.js');
}

// Determine if safe to extract
if (report.circular_deps.length === 0) {
  report.safe_to_extract = [
    {
      file: 'extension/lib/schemas.js',
      target: 'packages/shared/schemas.js',
      reason: 'No dependencies on normalizers'
    },
    {
      file: 'extension/lib/normalizers.js',
      target: 'apps/extension/src/lib/normalizers.js',
      imports_update: 'Change "./schemas.js" to "@brainbox/shared/schemas"'
    }
  ];
}

// Output
console.log('\n' + '='.repeat(60));
console.log('EXTRACTION STRATEGY:\n');

if (report.safe_to_extract.length > 0) {
  report.safe_to_extract.forEach(item => {
    console.log(`✅ ${item.file}`);
    console.log(`   → ${item.target}`);
    if (item.imports_update) {
      console.log(`   ℹ️  ${item.imports_update}`);
    }
    console.log();
  });
} else {
  console.log('❌ NOT SAFE TO EXTRACT (circular dependencies found)');
}

// Save report
const outputPath = path.join(__dirname, 'circular-dependency-report.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`\n📄 Report saved to: ${outputPath}`);

process.exit(report.circular_deps.length === 0 ? 0 : 1);
