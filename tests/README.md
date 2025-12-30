# BrainBox Tests

**`e2e/extension.spec.ts`** - Playwright end-to-end tests for Chrome extension functionality across all supported platforms.

**`cursor-chrome-composer.js`** - Chrome Remote Debugging Protocol monitor that displays console logs and network activity in real-time.

**`start-chrome-debug.sh`** - Script to start Chrome browser with remote debugging enabled on port 9222.

## Running Tests

```bash
npm test              # Run all Playwright tests
npm test:headed       # Run tests in headed mode
npm test:ui           # Run tests with UI
npm test:api          # Run API endpoint tests
npm test:chrome       # Test Chrome extension in isolated environment
npm run chrome:debug  # Start Chrome in debug mode
npm run chrome:monitor # Monitor Chrome console/network activity
```
