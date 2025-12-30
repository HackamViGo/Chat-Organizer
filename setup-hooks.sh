#!/bin/bash
# setup-hooks.sh - Git hooks за BrainBox проекта (без extension проверки)

echo "🧠 Setting up BrainBox Git hooks (no extension checks)..."

mkdir -p .git/hooks

# Pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook за BrainBox

echo "🔍 Running BrainBox pre-commit checks..."

# 1. TypeScript compilation check
echo "📝 Checking TypeScript..."
if ! npx tsc --noEmit; then
  echo "❌ TypeScript errors found. Fix before committing."
  exit 1
fi

# 2. ESLint check
echo "🔍 Running ESLint..."
if ! npm run lint; then
  echo "❌ ESLint errors found. Fix before committing."
  exit 1
fi

# 3. Check Next.js config
echo "⚙️ Validating Next.js config..."
if ! node -e "require('./next.config.js')"; then
  echo "❌ next.config.js is invalid"
  exit 1
fi

# 4. Check for console.log in production code
echo "🐛 Checking for console.log..."
CONSOLE_LOGS=$(git diff --cached -- 'src/**/*.{ts,tsx}' | grep -c "console.log" || true)
if [ "$CONSOLE_LOGS" -gt 3 ]; then
  echo "⚠️  Warning: Found $CONSOLE_LOGS console.log statements in src/"
fi

# 5. Check Supabase types
echo "🗄️ Checking Supabase types..."
if [ -f "src/types/database.types.ts" ]; then
  if git diff --cached --name-only | grep -q "supabase/migrations"; then
    echo "⚠️  Supabase migrations changed. Consider regenerating types:"
    echo "   npx supabase gen types typescript --local > src/types/database.types.ts"
  fi
fi

# 6. Check for sensitive data
echo "🔒 Checking for sensitive data..."
if git diff --cached | grep -iE "(SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY.*=.*[A-Za-z0-9]{20,})"; then
  echo "❌ Potential API key detected! Never commit API keys."
  exit 1
fi

# 7. Check folder types
echo "📁 Validating folder types..."
if git diff --cached | grep -E "type.*=.*['\"]" | grep -v "chat\|image\|prompt\|list"; then
  echo "⚠️  Warning: Make sure folder types are one of: chat, image, prompt, list"
fi

echo "✅ Pre-commit checks passed!"
exit 0
EOF

# Pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Pre-push hook за BrainBox

echo "🚀 Running BrainBox pre-push checks..."

# 1. Build check
echo "🏗️ Building project..."
if ! npm run build; then
  echo "❌ Build failed. Fix before pushing."
  exit 1
fi

# 2. Check bundle size
echo "📊 Checking bundle size..."
BUNDLE_SIZE=$(du -sh .next/static 2>/dev/null | cut -f1)
if [ -n "$BUNDLE_SIZE" ]; then
  echo "   Bundle size: $BUNDLE_SIZE"
fi

# 3. Check for TODOs in critical files
echo "📝 Checking for TODOs..."
TODO_COUNT=$(git grep -c "TODO" -- '*.ts' '*.tsx' 2>/dev/null | wc -l || echo "0")
if [ "$TODO_COUNT" -gt 0 ]; then
  echo "   Found $TODO_COUNT files with TODOs"
fi

# 4. Verify environment variables
echo "🔐 Verifying environment setup..."
if [ ! -f ".env.local" ]; then
  echo "⚠️  Warning: .env.local not found"
fi

echo "✅ Pre-push checks passed!"
echo ""
echo "📦 Ready to push to production!"
exit 0
EOF

# Commit-msg hook
cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Commit message hook за BrainBox

COMMIT_MSG=$(cat "$1")

# Check commit message format
# Examples:
# feat(api): add new endpoint
# fix(ui): resolve styling issue
# docs: update README

if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|build)(\(.+\))?: .+"; then
  echo "❌ Invalid commit message format!"
  echo ""
  echo "Format: <type>(<scope>): <subject>"
  echo ""
  echo "Types:"
  echo "  feat:     New feature"
  echo "  fix:      Bug fix"
  echo "  docs:     Documentation"
  echo "  style:    Formatting, styling"
  echo "  refactor: Code restructuring"
  echo "  test:     Tests"
  echo "  chore:    Maintenance"
  echo "  perf:     Performance"
  echo "  build:    Build system"
  echo ""
  echo "Scopes (optional):"
  echo "  api, ui, studio, folders, chats, prompts, images, etc."
  echo ""
  echo "Examples:"
  echo "  feat(api): add folders endpoint"
  echo "  fix(ui): resolve authentication issue"
  echo "  docs: update deployment guide"
  exit 1
fi

# Check message length
MSG_LENGTH=$(echo "$COMMIT_MSG" | head -1 | wc -c)
if [ "$MSG_LENGTH" -gt 72 ]; then
  echo "⚠️  Warning: Commit message is too long (${MSG_LENGTH} chars)"
  echo "   Keep it under 72 characters for better readability"
fi

# Check for BrainBox-specific keywords
if echo "$COMMIT_MSG" | grep -qi "brainbox"; then
  echo "✅ BrainBox-related commit"
fi

exit 0
EOF

# Post-checkout hook
cat > .git/hooks/post-checkout << 'EOF'
#!/bin/bash
# Post-checkout hook за BrainBox

echo "🔄 Branch switched. Running checks..."

# Check if package.json changed
if ! git diff --quiet HEAD@{1} HEAD -- package.json; then
  echo "📦 package.json changed. Installing dependencies..."
  npm install
fi

# Check if Supabase migrations changed
if ! git diff --quiet HEAD@{1} HEAD -- supabase/migrations; then
  echo "🗄️ Supabase migrations changed!"
  echo "   Run: npx supabase db push"
  echo "   Then: npx supabase gen types typescript --local > src/types/database.types.ts"
fi

exit 0
EOF

# Post-merge hook
cat > .git/hooks/post-merge << 'EOF'
#!/bin/bash
# Post-merge hook за BrainBox

echo "🔀 Code merged. Running updates..."

# Always install dependencies after merge
if ! git diff --quiet HEAD@{1} HEAD -- package.json; then
  echo "📦 Dependencies updated. Running npm install..."
  npm install
fi

# Regenerate types if migrations changed
if ! git diff --quiet HEAD@{1} HEAD -- supabase/migrations; then
  echo "🗄️ Regenerating Supabase types..."
  npx supabase gen types typescript --local > src/types/database.types.ts
fi

echo "✅ Post-merge updates complete!"
exit 0
EOF

# Make all hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/post-checkout
chmod +x .git/hooks/post-merge

echo "✅ BrainBox Git hooks installed!"
echo ""
echo "Installed hooks:"
echo "  • pre-commit:    TypeScript, ESLint checks"
echo "  • pre-push:      Build verification, bundle analysis"
echo "  • commit-msg:    Enforce conventional commits"
echo "  • post-checkout: Auto npm install, migration alerts"
echo "  • post-merge:    Update dependencies and types"
echo ""
echo "🧠 BrainBox development workflow ready!"
echo ""
echo "To bypass hooks (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
