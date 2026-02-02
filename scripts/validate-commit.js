/**
 * Commit Message Validator
 * 
 * Ensures commit messages follow the project's convention:
 * type(scope): description
 * 
 * Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 */
import fs from 'fs';

const commitMsgFile = process.argv[2];
if (!commitMsgFile) {
  console.error('No commit message file provided');
  process.exit(1);
}

const commitMsg = fs.readFileSync(commitMsgFile, 'utf8').trim();

// Regex for: type(scope?): description
const commitRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?: .{1,100}$/;

if (!commitRegex.test(commitMsg)) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: Invalid commit message format.');
  console.error('Convention: \x1b[36m%s\x1b[0m', 'type(scope): description');
  console.error('Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert');
  console.error('Example: feat(auth): add deepseek adapter');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', 'Commit message validated successfully.');
process.exit(0);
