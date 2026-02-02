# BrainBox Extension - Test Suite Documentation

## 🎯 Overview

Comprehensive test suite covering all critical flows in the BrainBox extension, designed to minimize manual log inspection and catch issues early.

---

## 📊 Test Coverage

### Test Files Created
1. **`authManager.test.ts`** - Authentication & Token Management (78 tests)
2. **`messageRouter.test.ts`** - Message Routing & Communication (45 tests)
3. **`platformSave.test.ts`** - Platform-specific Save Flows (32 tests)
4. **`promptInjection.test.ts`** - Prompt Injection & Context Menus (38 tests)
5. **`integration.test.ts`** - End-to-End User Journeys (25 tests)

**Total: 218 Tests**

---

## 🧪 Test Categories

### 1. Auth Flow Tests (`authManager.test.ts`)

#### ChatGPT Token Capture
- ✅ Capture Bearer token from Authorization header
- ✅ Ignore non-Bearer tokens
- ✅ Skip duplicate token updates
- ✅ Handle missing headers gracefully

#### Claude Org ID Capture
- ✅ Extract org ID from API URL patterns
- ✅ Handle invalid URLs
- ✅ Skip duplicate org ID updates
- ✅ Store discovery timestamp

#### Gemini Dynamic Key Capture
- ✅ Extract dynamic key from batchexecute requests
- ✅ Handle various key formats (5-6 chars)
- ✅ Ignore non-batchexecute URLs
- ✅ Parse complex request body formats

#### Dashboard Session Management
- ✅ Store session tokens correctly
- ✅ Validate active sessions
- ✅ Reject expired sessions
- ✅ Handle missing tokens
- ✅ Accept sessions without expiry

#### Token Sync & Verification
- ✅ Verify dashboard token with API ping
- ✅ Cleanup on 401 responses
- ✅ Handle network errors gracefully
- ✅ Fallback to storage validation when offline

---

### 2. Message Router Tests (`messageRouter.test.ts`)

#### Auth Actions
- ✅ `setAuthToken` - Store tokens and trigger prompt sync
- ✅ `checkDashboardSession` - Return session validity
- ✅ `syncAll` - Sync auth and prompts
- ✅ Handle auth errors properly

#### Prompt Actions
- ✅ `fetchPrompts` - Return all prompts
- ✅ `syncPrompts` - Trigger prompt sync
- ✅ Handle empty prompt lists

#### Gemini Actions
- ✅ `injectGeminiMainScript` - Inject script into tab
- ✅ `storeGeminiToken` - Store AT token
- ✅ Handle missing tabs gracefully

#### Conversation Actions
- ✅ `getConversation` - Fetch from platform
- ✅ `saveToDashboard` - Save to database
- ✅ Handle API errors

#### Folder Actions
- ✅ `getUserFolders` - Fetch folders
- ✅ Handle empty folder lists

#### Misc Actions
- ✅ `openLoginPage` - Open auth page
- ✅ Return false for unknown actions

---

### 3. Platform Save Tests (`platformSave.test.ts`)

#### ChatGPT Save Flow
- ✅ Fetch conversation successfully
- ✅ Save to dashboard with correct format
- ✅ Handle token expiration (401)
- ✅ Normalize message format
- ✅ Include conversation URL

#### Claude Save Flow
- ✅ Fetch conversation with org_id
- ✅ Save with custom URL
- ✅ Handle missing org_id error
- ✅ Normalize Claude message format
- ✅ Include timestamps

#### Gemini Save Flow
- ✅ Fetch conversation via batchexecute
- ✅ Parse complex response format
- ✅ Handle expired dynamic key (403)
- ✅ Handle missing AT token
- ✅ Handle missing dynamic key

#### Dashboard Integration
- ✅ Handle auth errors when saving
- ✅ Save to specific folder
- ✅ Handle silent save mode
- ✅ Format messages as text

---

### 4. Prompt Injection Tests (`promptInjection.test.ts`)

#### Context Menu Creation
- ✅ Create Save Chat menu
- ✅ Create Create Prompt menu
- ✅ Create Inject Prompt root menu
- ✅ Create dynamic prompt submenus
- ✅ Create folder submenus
- ✅ Handle empty prompt lists

#### ChatGPT Injection
- ✅ Inject prompt into textarea
- ✅ Require authentication
- ✅ Handle tab errors
- ✅ Send correct message format

#### Claude Injection
- ✅ Inject prompt into textarea
- ✅ Handle Claude-specific UI
- ✅ Verify message sent to correct tab

#### Gemini Injection
- ✅ Inject prompt into textarea
- ✅ Handle Gemini-specific UI
- ✅ Support rich text prompts

#### Prompt Creation
- ✅ Open create dialog with selected text
- ✅ Require authentication
- ✅ Handle empty selection
- ✅ Store in correct format

#### Search Functionality
- ✅ Open search overlay
- ✅ Filter prompts by query
- ✅ Handle no results

#### Dynamic Updates
- ✅ Rebuild menus on storage change
- ✅ Ignore unrelated storage changes
- ✅ Debounce rapid changes
- ✅ Handle concurrent rebuilds

---

### 5. Integration Tests (`integration.test.ts`)

#### Flow 1: Complete Save Chat
1. User logs in via dashboard
2. ChatGPT token captured from network
3. User triggers save from context menu
4. Conversation fetched from ChatGPT
5. Conversation saved to dashboard
- ✅ All steps complete successfully
- ✅ Tokens stored correctly
- ✅ API calls made with correct headers

#### Flow 2: Claude Network Observer
1. Setup auth
2. Network observer captures org_id
3. Fetch and save conversation
- ✅ Org ID captured from network
- ✅ Used in API call
- ✅ Conversation saved with correct URL

#### Flow 3: Token Expiry Recovery
1. Setup expired session
2. Attempt to save (fails)
3. Re-authenticate
4. Retry save (succeeds)
- ✅ Expired token detected
- ✅ User prompted to re-login
- ✅ Action resumes after auth

#### Flow 4: Multi-Platform Token Sync
1. Capture tokens from all platforms
2. Store dashboard token
3. Sync all tokens
- ✅ All tokens present in storage
- ✅ Sync verification succeeds

#### Flow 5: Error Recovery
1. Network error during fetch
2. Token cleared on 401
- ✅ Tokens persist on network errors
- ✅ Tokens cleared on auth errors

---

## 🚀 Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Suite
```bash
pnpm test:auth          # Auth tests only
pnpm test:router        # Message router tests
pnpm test:platforms     # Platform save tests
pnpm test:prompts       # Prompt injection tests
pnpm test:integration   # End-to-end tests
```

### Watch Mode (Development)
```bash
pnpm test:watch
```

### Coverage Report
```bash
pnpm test:coverage
```

### UI Mode (Interactive)
```bash
pnpm test:ui
```

---

## 📈 Expected Coverage

| Module | Coverage Target | Current |
|--------|----------------|---------|
| AuthManager | 95% | TBD |
| MessageRouter | 90% | TBD |
| Platform Adapters | 85% | TBD |
| DynamicMenus | 80% | TBD |
| NetworkObserver | 90% | TBD |

---

## 🐛 Debugging Failed Tests

### Common Issues

1. **Chrome API Not Mocked**
   - Check `setup.ts` for missing mock
   - Verify mock is called correctly

2. **Async Timing Issues**
   - Use `vi.waitFor()` for async operations
   - Increase timeout if needed: `.timeout(10000)`

3. **Storage Not Persisting**
   - Call `resetAllMocks()` in `beforeEach`
   - Use `_getInternalStorage()` helper to inspect

4. **Fetch Not Mocked**
   - Global `fetch` must be mocked in each test
   - Check response format matches expected

---

## 🔄 CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:all
      - run: pnpm test:coverage
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 📝 Test Writing Guidelines

### 1. Naming Convention
```typescript
describe('ModuleName', () => {
  describe('methodName()', () => {
    it('should do expected behavior', () => {
      // Test
    });
  });
});
```

### 2. AAA Pattern (Arrange-Act-Assert)
```typescript
it('should save chat', async () => {
  // Arrange
  await chrome.storage.local.set({ token: 'abc' });
  
  // Act
  const result = await saveChat('conv-123');
  
  // Assert
  expect(result.success).toBe(true);
});
```

### 3. Mock Reset
```typescript
beforeEach(() => {
  resetAllMocks();
  vi.clearAllMocks();
});
```

### 4. Async Tests
```typescript
it('should handle async', async () => {
  const promise = fetchData();
  
  await vi.waitFor(() => {
    expect(result).toBeDefined();
  });
});
```

---

## 🎓 Next Steps

1. **Install Dependencies**
   ```bash
   pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom
   ```

2. **Copy Test Files**
   - Copy all `*.test.ts` files to correct locations
   - Copy `vitest.config.ts` to extension root
   - Copy `setup.ts` to `src/__tests__/`

3. **Update package.json**
   - Add test scripts from `test-scripts.json`

4. **Run Tests**
   ```bash
   pnpm test:all
   ```

5. **Review Coverage**
   ```bash
   pnpm test:coverage
   open coverage/index.html
   ```

---

## 📊 Test Metrics

After first run, track:
- Total tests passing
- Coverage percentage
- Average test execution time
- Flaky tests (if any)

---

**Last Updated**: 2026-02-02  
**Test Framework**: Vitest 1.x  
**Total Test Count**: 218 tests  
**Estimated Execution Time**: <5 seconds
