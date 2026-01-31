#!/usr/bin/env node
/**
 * Path Integrity Check Script
 * Scans for @/ imports that will break during monorepo migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, '../../src');
const outputPath = path.join(__dirname, 'breaking-imports-report.txt');

console.log('🔍 Scanning for @/ imports...');

try {
  // Use grep to find all @/ imports (with proper escaping for spaces)
  const grepCommand = `grep -r "from '@/" "${srcDir}" --include="*.ts" --include="*.tsx" -n || true`;
  const result = execSync(grepCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  
  const lines = result.trim().split('\n').filter(l => l.length > 0);
  
  let report = `BREAKING IMPORTS DETECTED: ${lines.length} imports in ${new Set(lines.map(l => l.split(':')[0])).size} files\n\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `${'='.repeat(80)}\n\n`;
  
  // Group by file
  const fileGroups = {};
  lines.forEach(line => {
    const [filePath, lineNum, content] = line.split(':', 3);
    if (!fileGroups[filePath]) {
      fileGroups[filePath] = [];
    }
    fileGroups[filePath].push({ lineNum, content: content.trim() });
  });
  
  Object.entries(fileGroups).forEach(([filePath, imports]) => {
    const relativePath = path.relative(process.cwd(), filePath);
    report += `File: ${relativePath}\n`;
    imports.forEach(({ lineNum, content }) => {
      report += `  Line ${lineNum}: ${content}\n`;
    });
    report += `\n  → MIGRATION: Update tsconfig.json paths or migrate to @brainbox/* packages\n\n`;
  });
  
  report += `${'='.repeat(80)}\n`;
  report += `\nSUMMARY:\n`;
  report += `- Total files affected: ${Object.keys(fileGroups).length}\n`;
  report += `- Total @/ imports: ${lines.length}\n`;
  report += `- Recommendation: Review each import for migration strategy\n`;
  
  fs.writeFileSync(outputPath, report);
  
  console.log(`✅ Report generated: ${outputPath}`);
  console.log(`📊 Files affected: ${Object.keys(fileGroups).length}`);
  console.log(`📊 Total imports: ${lines.length}`);
  
} catch (error) {
  console.error('❌ Error scanning imports:', error.message);
  process.exit(1);
}
