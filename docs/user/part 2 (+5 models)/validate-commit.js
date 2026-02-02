#!/usr/bin/env node

/**
 * Validate Commit Message
 * Enforces conventional commit format
 */

const fs = require('fs');
const chalk = require('chalk');

const commitMsgFile = process.argv[2];
const commitMsg = fs.readFileSync(commitMsgFile, 'utf-8').trim();

// Conventional commit pattern
const conventionalCommitPattern = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\(.+\))?: .{1,100}/;

// Merge commit pattern
const mergeCommitPattern = /^Merge /;

// Check if it's a merge commit
if (mergeCommitPattern.test(commitMsg)) {
  console.log(chalk.blue('ℹ️  Merge commit detected, skipping validation'));
  process.exit(0);
}

// Validate conventional commit format
if (!conventionalCommitPattern.test(commitMsg)) {
  console.error(chalk.red('\n❌ Invalid commit message format!\n'));
  console.log(chalk.yellow('Your commit message:'));
  console.log(chalk.gray(`  "${commitMsg}"\n`));
  
  console.log(chalk.yellow('Commit message must follow Conventional Commits format:\n'));
  console.log(chalk.cyan('  <type>(<scope>): <subject>\n'));
  
  console.log(chalk.yellow('Valid types:'));
  console.log(chalk.gray('  feat:     A new feature'));
  console.log(chalk.gray('  fix:      A bug fix'));
  console.log(chalk.gray('  docs:     Documentation changes'));
  console.log(chalk.gray('  style:    Code style changes (formatting, etc.)'));
  console.log(chalk.gray('  refactor: Code refactoring'));
  console.log(chalk.gray('  perf:     Performance improvements'));
  console.log(chalk.gray('  test:     Adding or updating tests'));
  console.log(chalk.gray('  chore:    Maintenance tasks'));
  console.log(chalk.gray('  build:    Build system changes'));
  console.log(chalk.gray('  ci:       CI/CD changes'));
  console.log(chalk.gray('  revert:   Revert previous commit\n'));
  
  console.log(chalk.yellow('Examples:'));
  console.log(chalk.green('  feat(auth): add DeepSeek token capture'));
  console.log(chalk.green('  fix(router): handle missing tab gracefully'));
  console.log(chalk.green('  test(platforms): add Grok adapter tests'));
  console.log(chalk.green('  docs: update installation guide\n'));
  
  process.exit(1);
}

// Check subject length
const match = commitMsg.match(conventionalCommitPattern);
if (match) {
  const type = match[1];
  const scope = match[2] ? match[2].replace(/[()]/g, '') : null;
  
  console.log(chalk.green('✅ Valid commit message'));
  console.log(chalk.gray(`   Type: ${type}`));
  if (scope) {
    console.log(chalk.gray(`   Scope: ${scope}`));
  }
}

process.exit(0);
