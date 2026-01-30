# BrainBox Testing Suite 🧪

Welcome to the comprehensive testing suite for BrainBox. This directory is organized into a testing pyramid to ensure reliability across all layers of the application.

## 🏗 Directory Structure

### 1. `unit/` - Logic Validation
Small, isolated tests for core functions. No external dependencies.
- **`schema-validation.test.js`**: Validates chat objects against the common schema.
- **Run**: `npm run test:unit`

### 2. `integration/` - Connectivity & APIs
Tests the interaction between components (API -> Database, etc.).
- **`api-health.test.js`**: Verifies the local Next.js server is up and responding.
- **Run**: `npm run test:integration`

### 3. `scripts/` - Functional Validation
Complex scripts for validating high-level workflows.
- **`test-api.js`**: Full suite for all API endpoints (requires auth).
- **`validate_extension_sync.js`**: Checks if data from the extension syncs correctly.
- **Run**: `npm run test:api` or `npm run test:sync`

### 4. `database/` - Security & Schema
Database-specific checks.
- **`check-rls.js`**: Validates Row Level Security (RLS) policies in Supabase.
- **Run**: `npm run test:rls`

### 5. `chrome-env/` - Browser Debugging Tools
Environment for real-time extension debugging and isolated testing.
- **`start-chrome-debug.sh`**: Launches Chrome with RDP (Remote Debugging Protocol).
- **`cursor-chrome-composer.js`**: Multi-target monitor for console and network logs.
- **`test-chrome.sh`**: Isolated Profile Testing (mirrors production behavior).
- **Run**: `npm run chrome:debug` -> `npm run chrome:monitor`

### 6. `e2e/` - End-to-End Tests
Playwright tests simulating real user interactions on supported platforms (ChatGPT, Claude, Gemini).
- **Run**: `npm test`

---

## 🚀 Quick Reference Commands

```bash
# Core Tests
npm run test:unit         # Fast logic checks
npm run test:integration  # API Health checks
npm test                  # Playwright E2E suite

# Development & Debugging
npm run chrome:debug      # Launch Chrome Debugger
npm run chrome:monitor    # Real-time console/network monitor (Multi-target)
npm run test:chrome       # Test in isolated profile (Linux)

# Security & Data
npm run test:rls          # Check Supabase security policies
npm run test:api          # Full API suite (requires .env.local)
```
