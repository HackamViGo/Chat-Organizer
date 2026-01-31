#!/bin/bash
# Smoke Test for BrainBox Monorepo
# Verifies that the project builds correctly and essential services are ready

echo "💨 Running Proof-of-Concept Smoke Test..."

# 1. Verify Turbo Build
echo "Building all packages..."
pnpm turbo build

if [ $? -eq 0 ]; then
  echo "✅ Build Successful"
else
  echo "❌ Build Failed"
  exit 1
fi

# 2. Verify Database Types
echo "Checking database types..."
if [ -f "packages/database/database.types.ts" ]; then
  echo "✅ Database types exist"
else
  echo "❌ Database types missing"
  exit 1
fi

echo "✅ Smoke Test Passed!"
exit 0
