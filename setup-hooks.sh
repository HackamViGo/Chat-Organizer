#!/bin/bash
# Git hooks for BrainBox

mkdir -p .git/hooks

# Pre-commit hook
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
echo "🔍 Pre-commit checks..."

# TypeScript
if ! npm run build; then
  echo "❌ Build failed"
  exit 1
fi

# Extension size
if [ -d "extension" ]; then
  SIZE=$(du -sb extension | cut -f1)
  if [ "$SIZE" -gt 25000 ]; then
    echo "⚠️  Extension size: ${SIZE} bytes (limit: 25KB)"
  fi
fi

echo "✅ Checks passed"
HOOK

chmod +x .git/hooks/pre-commit
