# AI Chat Organizer - Browser Extension Development Tasks

## Phase 1: Foundation & Setup
- [x] **Project Structure**
  - [x] Create `/extension` directory structure
    - [x] `/manifest.json`
    - [x] `/background/` (Service Worker)
    - [x] `/content/` (Content Scripts per platform)
    - [x] `/ui/` (Popup and injected UI components)
    - [x] `/lib/` (Shared utilities)
    - [x] `/icons/` (Extension icons)
  - [x] Initialize package.json for extension dependencies
  - [x] Setup build configuration (if using TypeScript/bundler)

- [x] **Manifest V3 Configuration**
  - [x] Create base `manifest.json`
  - [x] Define permissions: `storage`, `webRequest`
  - [x] Define host_permissions for ChatGPT, Claude, Gemini, Dashboard
  - [x] Configure service_worker (background.js)
  - [x] Configure content_scripts for each platform
  - [x] Add web_accessible_resources
  - [x] Define extension icons and popup

- [x] **Testing Setup**
  - [x] Document how to load unpacked extension in Chrome
  - [x] Create test checklist document
  - [x] Setup automated E2E tests (Playwright)

---

## Phase 2: Service Worker (Background Script)
- [x] **Token Interceptor Module**
  - [x] Implement `chrome.webRequest.onBeforeSendHeaders` listener
  - [x] Extract ChatGPT Bearer token from Authorization header
  - [x] Store token in `chrome.storage.local`
  - [x] Handle token expiration (detect 401 responses)
  - [x] **TEST**: Verify token captured within 5s of ChatGPT page load

- [x] **Storage Manager**
  - [x] Create storage schema for tokens, settings, cache
  - [x] Implement get/set wrapper functions
  - [x] Add storage quota monitoring
  - [x] **TEST**: Verify storage operations work correctly

- [x] **Message Handler**
  - [x] Setup `chrome.runtime.onMessage` listener
  - [x] Handle messages from content scripts
  - [x] Handle messages from popup
  - [x] **TEST**: Verify bidirectional communication works

---

## Phase 3: ChatGPT Implementation (MVP Platform)
- [x] **Content Script - ChatGPT**
  - [x] Inject into `https://chatgpt.com/*`
  - [x] Detect conversation list sidebar
  - [x] Extract conversation IDs from DOM
  - [x] Setup MutationObserver for sidebar changes
  - [x] **TEST**: Log detected conversation IDs to console

- [ ] **Hover UI Component**
  - [ ] Create hover button HTML/CSS (native-looking design)
  - [ ] Inject buttons on mouseenter events
  - [ ] Position buttons next to conversation titles
  - [ ] Add click event handlers
  - [ ] **TEST**: Verify buttons appear within 200ms of hover

- [ ] **API Data Extraction - ChatGPT**
  - [ ] Implement fetch to `https://chatgpt.com/backend-api/conversation/{id}`
  - [ ] Use stored Bearer token in Authorization header
  - [ ] Parse JSON response
  - [ ] Extract messages from `mapping` object
  - [ ] **TEST**: Successfully fetch and log conversation data

- [ ] **Data Normalization**
  - [ ] Create Zod schema for normalized conversation format
  - [ ] Implement ChatGPT-to-schema transformer
  - [ ] Validate transformed data
  - [ ] **TEST**: Verify schema validation passes for sample conversations

---

## Phase 4: Dashboard Integration

- [x] **Dashboard Session Validation**
  - [x] Check for dashboard session cookie
  - [x] Implement session validation endpoint call
  - [x] Show login prompt if not authenticated
  - [x] **TEST**: Verify extension detects dashboard login state

- [x] **Save to Dashboard API**
  - [x] Implement POST to dashboard `/api/conversations` endpoint
  - [x] Include conversation data and folder_id
  - [x] Handle success response
  - [x] Handle error responses (401, 500, etc.)
  - [x] **TEST**: Successfully save conversation to dashboard

- [x] **Toast Notification System**
  - [x] Create toast UI component (HTML/CSS)
  - [x] Implement show/hide animations
  - [x] Add success/error message variants
  - [x] Add "Change folder" action button
  - [x] **TEST**: Verify toast appears on save action

- [x] **Folder Selection UI**
  - [x] Fetch user's folder list from dashboard
  - [x] Create inline folder selector dropdown
  - [x] Implement "New Folder" creation flow
  - [x] Store last-used folder preference
  - [x] **TEST**: Verify folder selection updates save destination

---

## Phase 5: Rate Limiting & Error Handling

- [x] **Request Queue System**
  - [x] Implement priority queue (HIGH/MEDIUM/LOW)
  - [x] Add rate limiter (max 1 request per 3s for ChatGPT)
  - [x] Implement token bucket algorithm
  - [x] Add request retry logic with exponential backoff
  - [x] **TEST**: Send 50 rapid requests, verify max 20/min executed

- [x] **Error Handling Matrix**
  - [x] Handle 401 (token expired) - prompt user to refresh
  - [x] Handle 429 (rate limit) - pause requests for 60s
  - [x] Handle 500 (server error) - retry 3 times then fail
  - [x] Handle network errors - queue for retry
  - [x] **TEST**: Simulate each error type, verify correct handling

- [x] **User Notifications**
  - [x] Create error message templates
  - [x] Implement retry button for failed saves
  - [x] Add status indicator in extension icon
  - [x] **TEST**: Verify user sees helpful error messages

---

## Phase 6: Claude Implementation

- [ ] **Content Script - Claude**
  - [ ] Inject into `https://claude.ai/*`
  - [ ] Detect conversation list structure
  - [ ] Extract conversation IDs and org_id
  - [ ] Inject hover buttons
  - [ ] **TEST**: Verify buttons work on Claude

- [ ] **API Data Extraction - Claude**
  - [ ] Implement fetch to Claude API endpoint
  - [ ] Use cookie-based authentication
  - [ ] Parse response structure
  - [ ] **TEST**: Successfully fetch Claude conversation

- [ ] **Data Normalization - Claude**
  - [ ] Implement Claude-to-schema transformer
  - [ ] Validate with Zod schema
  - [ ] **TEST**: Verify normalized data matches schema

---

## Phase 7: Gemini Implementation (Advanced)

- [x] **Token Extraction - Gemini**
  - [x] Inject script to read `window.WIZ_global_data.SNlM0e`
  - [x] Use postMessage to send token to content script
  - [x] Store AT token in chrome.storage
  - [x] **TEST**: Verify token extracted on Gemini page load

- [x] **Dynamic Key Discovery**
  - [x] Setup `chrome.webRequest.onBeforeRequest` for batchexecute
  - [x] Extract f.req parameter from legitimate requests
  - [x] Parse and extract dynamic function key (e.g., "xsZAb")
  - [x] Store key with timestamp
  - [x] Implement key rotation detection (on 400/403 errors)
  - [x] **TEST**: Verify key discovered within 3s of first interaction

- [x] **API Request Construction - Gemini**
  - [x] Implement double-serialized JSON payload builder
  - [x] Construct URLSearchParams body with f.req and at
  - [x] Set required headers (Content-Type, X-Same-Domain)
  - [x] **TEST**: Successfully construct valid request

- [x] **Response Parsing - Gemini**
  - [x] Remove security prefix ()]}'\n)
  - [x] First JSON.parse()
  - [x] Navigate to data[0][2]
  - [x] Second JSON.parse()
  - [x] Extract conversation data
  - [x] **TEST**: Successfully parse Gemini response

- [x] **Data Normalization - Gemini**
  - [x] Implement Gemini-to-schema transformer
  - [x] Handle nested array structures
  - [x] Validate with Zod schema
  - [x] **TEST**: Verify normalized Gemini data

- [x] **Error Recovery - Gemini**
  - [x] Detect schema changes (validation failures)
  - [x] Trigger key rediscovery on API errors
  - [x] Fallback to DOM extraction if API fails
  - [x] **TEST**: Verify graceful degradation

---

## Phase 8: Performance & Memory Optimization

- [ ] **MutationObserver Management**
  - [ ] Implement debounce (200ms) for observer callbacks
  - [ ] Disconnect observer when tab inactive
  - [ ] Reconnect observer when tab active
  - [ ] Use WeakMap for DOM element references
  - [ ] **TEST**: Verify memory usage stays under 50MB

- [ ] **Performance Monitoring**
  - [ ] Track API request durations (performance.now())
  - [ ] Track UI injection times
  - [ ] Log slow operations (>5s)
  - [ ] **TEST**: Verify operations meet performance benchmarks

- [ ] **Cleanup Mechanisms**
  - [ ] Remove event listeners on navigation
  - [ ] Clear stale cache entries
  - [ ] Implement garbage collection triggers
  - [ ] **TEST**: Verify no memory leaks after 1 hour usage

---

## Phase 9: Advanced Features

- [ ] **Auto-Categorization (Gemini API)**
  - [ ] Implement prompt for folder suggestion
  - [ ] Call dashboard Gemini API endpoint (BYOK)
  - [ ] Parse AI response
  - [ ] Apply suggested folder with user confirmation
  - [ ] **TEST**: Verify categorization works for 5 test conversations

- [ ] **Batch Save (Pro Feature)**
  - [ ] Add checkbox mode to conversation list
  - [ ] Implement Shift+Click multi-select
  - [ ] Queue multiple API requests
  - [ ] Show batch progress indicator
  - [ ] **TEST**: Successfully save 10 conversations at once

- [ ] **Custom Folder Shortcuts**
  - [ ] Allow user to configure 3 quick-save folders
  - [ ] Store preferences in chrome.storage.sync
  - [ ] Update hover button UI with custom folders
  - [ ] **TEST**: Verify custom folders persist across sessions

---

## Phase 10: Testing & Quality Assurance

- [ ] **Functional Testing**
  - [ ] Test on ChatGPT (free and plus accounts)
  - [ ] Test on Claude (free and pro accounts)
  - [ ] Test on Gemini (free account)
  - [ ] Test with dashboard logged in/out states
  - [ ] Test with slow network (throttle to 3G)
  - [ ] **CHECKLIST**: All platforms save successfully

- [ ] **Error Scenario Testing**
  - [ ] Test with expired tokens
  - [ ] Test with rate limiting triggered
  - [ ] Test with dashboard API down
  - [ ] Test with invalid conversation IDs
  - [ ] **CHECKLIST**: All errors handled gracefully

- [ ] **Performance Testing**
  - [ ] Measure extension load time
  - [ ] Measure hover button injection time
  - [ ] Measure API request times
  - [ ] Monitor memory usage over 1 hour
  - [ ] **CHECKLIST**: All benchmarks met

- [ ] **Security Testing**
  - [ ] Verify no tokens logged to console
  - [ ] Verify HTTPS enforced for all requests
  - [ ] Test CSP compliance
  - [ ] Verify no XSS vulnerabilities
  - [ ] **CHECKLIST**: Security audit passed

---

## Phase 11: Documentation & Deployment Prep

- [x] **User Documentation**
  - [x] Write installation guide
  - [x] Create usage tutorial with screenshots
  - [x] Document troubleshooting steps
  - [x] Create FAQ

- [ ] **Developer Documentation**
  - [ ] Document code architecture
  - [ ] Add inline code comments
  - [ ] Create API reference
  - [ ] Document build process

- [x] **Chrome Web Store Preparation**
  - [x] Create store listing description
  - [ ] Design promotional images (1280x800, 640x400)
  - [x] Write privacy policy
  - [ ] Prepare permission justifications
  - [ ] Create demo video (optional)

- [x] **Final Checks**
  - [x] Remove all console.log statements
  - [ ] Minify code (if applicable)
  - [x] Test on fresh Chrome profile
  - [x] Verify all permissions are necessary
  - [x] **CHECKLIST**: Ready for submission

---

## Testing Commands & Procedures

### Load Extension for Testing
```bash
# 1. Open Chrome and navigate to:
chrome://extensions/

# 2. Enable "Developer mode" (top right toggle)

# 3. Click "Load unpacked"

# 4. Select the /extension directory
```

### Manual Test Checklist

**ChatGPT Test:**
1. Open https://chatgpt.com
2. Wait 5 seconds for extension to initialize
3. Hover over any conversation in sidebar
4. Verify save button appears
5. Click save button
6. Verify toast notification shows success
7. Check dashboard to confirm conversation saved

**Claude Test:**
1. Open https://claude.ai
2. Repeat steps 2-7 from ChatGPT test

**Gemini Test:**
1. Open https://gemini.google.com
2. Open any existing conversation (required for key discovery)
3. Wait 3 seconds for key discovery
4. Navigate back to conversation list
5. Hover over conversation
6. Click save button
7. Verify success

**Error Test:**
1. Log out of dashboard
2. Try to save conversation
3. Verify login prompt appears
4. Log back in
5. Retry save
6. Verify success

### Performance Benchmarks
- Token extraction: < 1s
- Hover button injection: < 200ms
- API request (ChatGPT): < 500ms
- API request (Gemini): < 1s (includes parsing)
- Memory usage (idle): < 50MB
- Memory usage (after 10 saves): < 100MB

---

## Priority Order for Development

**Week 1: MVP (ChatGPT Only)**
- Phase 1, 2, 3, 4 (basic functionality)
- Goal: Working ChatGPT save to dashboard

**Week 2: Multi-Platform**
- Phase 6 (Claude)
- Phase 7 (Gemini)
- Goal: All platforms supported

**Week 3: Polish & Testing**
- Phase 5 (error handling)
- Phase 8 (performance)
- Phase 10 (testing)
- Goal: Production-ready quality

**Week 4: Advanced Features**
- Phase 9 (auto-categorization, batch save)
- Phase 11 (documentation, deployment)
- Goal: Ready for Chrome Web Store
