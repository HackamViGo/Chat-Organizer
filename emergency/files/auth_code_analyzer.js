#!/usr/bin/env node

/**
 * 🔍 Auth Code Analyzer
 * 
 * Статичен анализ на Extension кода за откриване на чести auth проблеми
 * 
 * USAGE:
 * node auth_code_analyzer.js /path/to/extension/src
 */

const fs = require('fs');
const path = require('path');

const EXTENSION_SRC = process.argv[2] || '/mnt/user-data/uploads/apps/extension/src';

console.log('🔍 AUTH CODE ANALYZER');
console.log('='.repeat(80));
console.log('Scanning:', EXTENSION_SRC);
console.log('\n');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// ============================================================================
// PROBLEM DETECTORS
// ============================================================================

const problems = [];

function addProblem(severity, file, line, issue, recommendation) {
  problems.push({
    severity,
    file: path.relative(EXTENSION_SRC, file),
    line,
    issue,
    recommendation
  });
}

// 1. Detect chrome.storage.local.clear() в onInstalled
function checkInstallationManager(files) {
  console.log('🔍 Checking installationManager.ts...');
  
  const installFile = files.find(f => f.includes('installationManager'));
  
  if (!installFile) {
    console.log('  ⚠️  installationManager.ts not found');
    return;
  }
  
  const content = fs.readFileSync(installFile, 'utf8');
  const lines = content.split('\n');
  
  let inOnInstalled = false;
  
  lines.forEach((line, i) => {
    if (line.includes('onInstalled.addListener')) {
      inOnInstalled = true;
    }
    
    if (inOnInstalled) {
      if (line.includes('storage.local.clear()')) {
        addProblem(
          'CRITICAL',
          installFile,
          i + 1,
          'chrome.storage.local.clear() in onInstalled listener',
          'This deletes ALL storage including auth tokens on every extension update/reload. Only clear on reason === "install"'
        );
      }
      
      if (line.includes('storage.local.remove') && (
        line.includes('auth') || 
        line.includes('token') || 
        line.includes('user')
      )) {
        addProblem(
          'HIGH',
          installFile,
          i + 1,
          'Removing auth-related keys in onInstalled',
          'This will log out users on every extension update'
        );
      }
      
      if (line.includes('}') && line.trim() === '});') {
        inOnInstalled = false;
      }
    }
  });
  
  console.log('  ✓ Done');
}

// 2. Check authManager for token refresh logic
function checkAuthManager(files) {
  console.log('🔍 Checking authManager.ts...');
  
  const authFile = files.find(f => f.includes('authManager'));
  
  if (!authFile) {
    console.log('  ⚠️  authManager.ts not found');
    return;
  }
  
  const content = fs.readFileSync(authFile, 'utf8');
  
  if (!content.includes('refresh')) {
    addProblem(
      'MEDIUM',
      authFile,
      0,
      'No token refresh logic found',
      'Implement automatic token refresh before expiry to prevent forced re-login'
    );
  }
  
  if (!content.includes('initialize') && !content.includes('init')) {
    addProblem(
      'HIGH',
      authFile,
      0,
      'No initialization method found',
      'AuthManager should have initialize() to load token from storage on startup'
    );
  }
  
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('setToken') && !line.includes('expires')) {
      // This is a heuristic - might be false positive
      if (i < lines.length - 10) {
        const nextLines = lines.slice(i, i + 10).join('\n');
        if (!nextLines.includes('exp')) {
          addProblem(
            'LOW',
            authFile,
            i + 1,
            'setToken() may not be tracking expiry',
            'Store token expiry time and set up refresh timer'
          );
        }
      }
    }
  });
  
  console.log('  ✓ Done');
}

// 3. Check content-dashboard-auth for proper message sending
function checkDashboardAuth(files) {
  console.log('🔍 Checking content-dashboard-auth.ts...');
  
  const authFile = files.find(f => f.includes('content-dashboard-auth'));
  
  if (!authFile) {
    console.log('  ⚠️  content-dashboard-auth.ts not found');
    return;
  }
  
  const content = fs.readFileSync(authFile, 'utf8');
  
  if (!content.includes('postMessage')) {
    addProblem(
      'CRITICAL',
      authFile,
      0,
      'No postMessage() found',
      'Token bridge must use window.postMessage() to send token to extension'
    );
  }
  
  if (!content.includes('localStorage') && !content.includes('supabase')) {
    addProblem(
      'HIGH',
      authFile,
      0,
      'Not reading from localStorage/Supabase',
      'Must read Supabase session from localStorage to get token'
    );
  }
  
  console.log('  ✓ Done');
}

// 4. Check service-worker for proper auth initialization
function checkServiceWorker(files) {
  console.log('🔍 Checking service-worker.ts...');
  
  const swFile = files.find(f => f.includes('service-worker.ts'));
  
  if (!swFile) {
    console.log('  ⚠️  service-worker.ts not found');
    return;
  }
  
  const content = fs.readFileSync(swFile, 'utf8');
  
  // Check if AuthManager is imported
  if (!content.includes('AuthManager')) {
    addProblem(
      'CRITICAL',
      swFile,
      0,
      'AuthManager not imported',
      'Service worker must import and initialize AuthManager'
    );
  }
  
  // Check if authManager is a singleton
  const lines = content.split('\n');
  let authManagerCount = 0;
  
  lines.forEach((line, i) => {
    if (line.includes('new AuthManager()')) {
      authManagerCount++;
      if (authManagerCount > 1) {
        addProblem(
          'HIGH',
          swFile,
          i + 1,
          'Multiple AuthManager instances created',
          'Should have ONE global instance, not create new one in listeners'
        );
      }
    }
  });
  
  if (authManagerCount === 0 && content.includes('AuthManager')) {
    addProblem(
      'MEDIUM',
      swFile,
      0,
      'AuthManager imported but never instantiated',
      'Create global authManager instance'
    );
  }
  
  console.log('  ✓ Done');
}

// 5. Check for hardcoded tokens or credentials
function checkHardcodedSecrets(files) {
  console.log('🔍 Checking for hardcoded secrets...');
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, i) => {
      // JWT pattern
      if (line.match(/['"]eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+['"]/)) {
        addProblem(
          'CRITICAL',
          file,
          i + 1,
          'Hardcoded JWT token found',
          'NEVER commit tokens to code! Use environment variables'
        );
      }
      
      // API keys
      if (line.match(/['"][A-Za-z0-9]{32,}['"]/)) {
        const context = line.toLowerCase();
        if (context.includes('key') || context.includes('secret') || context.includes('token')) {
          addProblem(
            'HIGH',
            file,
            i + 1,
            'Possible hardcoded API key',
            'Use environment variables for secrets'
          );
        }
      }
    });
  });
  
  console.log('  ✓ Done');
}

// 6. Check dashboard API client
function checkDashboardApi(files) {
  console.log('🔍 Checking dashboardApi.ts...');
  
  const apiFile = files.find(f => f.includes('dashboardApi'));
  
  if (!apiFile) {
    console.log('  ⚠️  dashboardApi.ts not found');
    return;
  }
  
  const content = fs.readFileSync(apiFile, 'utf8');
  const lines = content.split('\n');
  
  let hasAuthHeader = false;
  let hasErrorHandling = false;
  
  lines.forEach((line, i) => {
    if (line.includes('Authorization') || line.includes('Bearer')) {
      hasAuthHeader = true;
    }
    
    if (line.includes('401') || (line.includes('catch') && line.includes('401'))) {
      hasErrorHandling = true;
    }
  });
  
  if (!hasAuthHeader) {
    addProblem(
      'CRITICAL',
      apiFile,
      0,
      'No Authorization header found in API client',
      'All authenticated requests must include "Authorization: Bearer <token>"'
    );
  }
  
  if (!hasErrorHandling) {
    addProblem(
      'MEDIUM',
      apiFile,
      0,
      'No 401 error handling',
      'Should clear token and prompt re-login on 401 responses'
    );
  }
  
  console.log('  ✓ Done');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('Starting analysis...\n');

if (!fs.existsSync(EXTENSION_SRC)) {
  console.error('❌ Extension source directory not found!');
  console.error('   Tried:', EXTENSION_SRC);
  console.error('\nUSAGE: node auth_code_analyzer.js /path/to/extension/src');
  process.exit(1);
}

const files = getAllFiles(EXTENSION_SRC);
console.log(`Found ${files.length} TypeScript/JavaScript files\n`);

// Run all checks
checkInstallationManager(files);
checkAuthManager(files);
checkDashboardAuth(files);
checkServiceWorker(files);
checkHardcodedSecrets(files);
checkDashboardApi(files);

// ============================================================================
// REPORT RESULTS
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('📋 ANALYSIS RESULTS');
console.log('='.repeat(80) + '\n');

if (problems.length === 0) {
  console.log('✅ No auth-related issues detected!\n');
} else {
  console.log(`Found ${problems.length} potential issues:\n`);
  
  const critical = problems.filter(p => p.severity === 'CRITICAL');
  const high = problems.filter(p => p.severity === 'HIGH');
  const medium = problems.filter(p => p.severity === 'MEDIUM');
  const low = problems.filter(p => p.severity === 'LOW');
  
  if (critical.length > 0) {
    console.log('🔴 CRITICAL ISSUES:');
    console.log('-'.repeat(80));
    critical.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.issue}`);
      console.log(`   File: ${p.file}${p.line ? `:${p.line}` : ''}`);
      console.log(`   💡 ${p.recommendation}`);
    });
    console.log('\n');
  }
  
  if (high.length > 0) {
    console.log('🟠 HIGH PRIORITY:');
    console.log('-'.repeat(80));
    high.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.issue}`);
      console.log(`   File: ${p.file}${p.line ? `:${p.line}` : ''}`);
      console.log(`   💡 ${p.recommendation}`);
    });
    console.log('\n');
  }
  
  if (medium.length > 0) {
    console.log('🟡 MEDIUM PRIORITY:');
    console.log('-'.repeat(80));
    medium.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.issue}`);
      console.log(`   File: ${p.file}${p.line ? `:${p.line}` : ''}`);
      console.log(`   💡 ${p.recommendation}`);
    });
    console.log('\n');
  }
  
  if (low.length > 0) {
    console.log('ℹ️  LOW PRIORITY:');
    console.log('-'.repeat(80));
    low.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.issue}`);
      console.log(`   File: ${p.file}${p.line ? `:${p.line}` : ''}`);
      console.log(`   💡 ${p.recommendation}`);
    });
    console.log('\n');
  }
}

console.log('='.repeat(80));
console.log('✅ Analysis complete!');
console.log('='.repeat(80) + '\n');

// Exit with error code if critical issues found
process.exit(critical.length > 0 ? 1 : 0);
