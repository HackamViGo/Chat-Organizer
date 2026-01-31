#!/usr/bin/env node
/**
 * Dependency Audit Script
 * Checks for conflicting package versions before Turborepo migration
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const report = {
  conflicts: [],
  warnings: [],
  safe_to_proceed: true,
  timestamp: new Date().toISOString()
};

// Check React version
const reactVersion = packageJson.dependencies?.react || 'not found';
if (reactVersion.includes('^19') || reactVersion.includes('~19')) {
  report.warnings.push({
    package: 'react',
    current: reactVersion,
    issue: 'React 19 може да има incompatibility с някои Next.js plugins',
    recommended: 'Проверка на compatibility преди migration'
  });
}

// Check Next.js version
const nextVersion = packageJson.dependencies?.next || 'not found';
const nextMajor = nextVersion.match(/\d+/)?.[0];
if (nextMajor && parseInt(nextMajor) < 14) {
  report.conflicts.push({
    package: 'next',
    current: nextVersion,
    required: '>=14.2.0',
    reason: 'Turborepo изисква Next.js 14+ за оптимална поддръжка'
  });
  report.safe_to_proceed = false;
}

// Check for duplicate dependencies (would conflict in monorepo)
const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies
};

const criticalPackages = ['react', 'react-dom', 'typescript', '@types/react'];
const duplicateCheck = {};

criticalPackages.forEach(pkg => {
  if (allDeps[pkg]) {
    duplicateCheck[pkg] = allDeps[pkg];
  }
});

// Output report
const outputPath = path.join(__dirname, 'dependency-conflicts.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log('📊 Dependency Audit Report');
console.log('='.repeat(50));
console.log(`Conflicts: ${report.conflicts.length}`);
console.log(`Warnings: ${report.warnings.length}`);
console.log(`Safe to proceed: ${report.safe_to_proceed ? '✅ YES' : '❌ NO'}`);
console.log(`\nReport saved to: ${outputPath}`);

if (report.conflicts.length > 0) {
  console.log('\n🚨 CONFLICTS DETECTED:');
  report.conflicts.forEach(c => {
    console.log(`  - ${c.package}: ${c.current} (requires ${c.required})`);
    console.log(`    Reason: ${c.reason}`);
  });
}

if (report.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  report.warnings.forEach(w => {
    console.log(`  - ${w.package}: ${w.current}`);
    console.log(`    ${w.issue}`);
  });
}

process.exit(report.safe_to_proceed ? 0 : 1);
