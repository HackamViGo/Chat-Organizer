# BrainBox Test Suite Documentation

## Overview

The BrainBox test suite is built with Vitest and focuses on ensuring reliability across authentication, message routing, and platform-specific data capture.

## Test Structure

- `apps/extension/src/__tests__/`: Global setup and shared mocks.
- `apps/extension/src/background/modules/__tests__/`: Integration and core manager tests.
- `apps/extension/src/background/modules/platformAdapters/__tests__/`: Individual platform adapter unit tests.

## Key Test Suites

### Core Managers
- **AuthManager**: Verifies token capture, storage, and synchronization logic.
- **MessageRouter**: Ensures background messages are routed to correct handlers.

### Platform Adapters
Unit tests for each adapter ensure that platform-specific API responses are correctly normalized into the BrainBox standard format.

#### Existing Adapters:
- ChatGPT
- Claude
- Gemini

#### New Adapters (Integrated Feb 2026):
- DeepSeek
- Perplexity
- Grok
- Qwen
- LMSYS Chatbot Arena

### Integration Tests
- `integration.test.ts`: E2E flows for original platforms.
- `newPlatforms.integration.test.ts`: E2E flows and multi-platform sync for the 5 new platforms.

## Running Tests

From the project root:

```bash
# Run all extension tests
pnpm --filter @brainbox/extension test:all

# Run tests with coverage
pnpm --filter @brainbox/extension test:coverage
```

## Maintenance

When adding a new platform:
1. Create a unit test in `platformAdapters/__tests__`.
2. Add an integration case in `newPlatforms.integration.test.ts`.
3. Update `package.json` scripts if necessary.
