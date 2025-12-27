# Browser Extension Technical Specification: AI Chat Organizer

## SYSTEM_CONTEXT
```
PLATFORM_TARGETS: ["ChatGPT", "Claude", "Gemini"]
ARCHITECTURE: Manifest_V3_Chrome_Extension
DATA_FLOW: Browser_Extension -> User_Dashboard_Website -> Optional[NotebookLM|GoogleDrive]
AUTH_MODEL: OAuth2_Google + BYOK_API_Keys
CORE_OBJECTIVE: Zero_friction_chat_extraction_and_organization
```

## ARCHITECTURE_OVERVIEW

### Component_Hierarchy
```
├── Service_Worker (background.js)
│   ├── Token_Interceptor
│   ├── API_Request_Handler
│   ├── Dynamic_Key_Discovery_Engine
│   └── Rate_Limiter_Queue
├── Content_Scripts (per_platform)
│   ├── DOM_Injector
│   ├── Hover_UI_Manager
│   ├── MutationObserver_Controller
│   └── Shadow_DOM_Penetrator
├── Dashboard_API_Bridge
│   ├── Authentication_Validator
│   ├── Zod_Schema_Validator
│   └── Zustand_State_Sync
└── Popup_UI (optional_minimal)
```

## CRITICAL_TECHNICAL_REQUIREMENTS

### 1. AUTHENTICATION_LAYER

#### Platform_Token_Extraction
```javascript
// IMPLEMENTATION_PATTERN: Passive_Interception
// NO_USER_ACTION_REQUIRED

CHATGPT: {
  method: "webRequest.onBeforeSendHeaders",
  target_header: "Authorization: Bearer <TOKEN>",
  storage_key: "chatgpt_auth_token",
  endpoint_pattern: "https://chatgpt.com/backend-api/*",
  token_lifespan: "session_based",
  refresh_strategy: "auto_detect_401_response"
}

GEMINI: {
  method: "content_script_injection",
  target_object: "window.WIZ_globaldata.SNlM0e",
  storage_key: "gemini_at_token",
  endpoint_pattern: "https://gemini.google.com/_/BardChatUi/data/batchexecute",
  token_lifespan: "page_session",
  refresh_strategy: "re_extract_on_navigation",
  additional_requirements: {
    cookies: "auto_attached_by_browser",
    csrf_header: "X-Same-Domain: 1"
  }
}

CLAUDE: {
  method: "cookie_based_authentication",
  target_cookie: "session-key",
  storage_key: "claude_session",
  endpoint_pattern: "https://claude.ai/api/organizations/*/chat_conversations/*",
  token_lifespan: "persistent_cookie",
  refresh_strategy: "browser_handles_automatically"
}
```

#### Dashboard_Authentication_Sync
```javascript
// USER_MUST_BE_LOGGED_INTO_DASHBOARD
// Extension validates dashboard session before any save operation

VALIDATION_FLOW: {
  step_1: "extension checks chrome.cookies for dashboard_domain",
  step_2: "if session_valid: enable_save_buttons",
  step_3: "if session_invalid: show_login_prompt_overlay",
  step_4: "on_save_action: include_dashboard_session_token_in_POST"
}

SECURITY_MODEL: {
  extension_role: "authenticated_courier",
  data_path: "Platform_API -> Extension -> Dashboard_API",
  encryption: "HTTPS_enforced_all_endpoints",
  storage: "no_permanent_chat_storage_in_extension"
}
```

### 2. DATA_EXTRACTION_STRATEGIES

#### GEMINI_SPECIFIC_IMPLEMENTATION (HIGHEST_COMPLEXITY)

##### Dynamic_Key_Discovery_System
```javascript
// PROBLEM: Google rotates internal function names (e.g., "xsZAb" -> "y8Bc2d")
// SOLUTION: Runtime pattern detection

DISCOVERY_ALGORITHM: {
  trigger: "first_user_interaction_with_gemini",
  method: "webRequest.onBeforeRequest listener",
  
  pattern_detection: {
    step_1: "intercept legitimate batchexecute request",
    step_2: "extract f.req parameter from request body",
    step_3: "regex_pattern: /\"([a-zA-Z0-9]{5,6})\",\s*\"\[/",
    step_4: "validate extracted key matches conversation_id pattern",
    step_5: "store in chrome.storage.local with timestamp"
  },
  
  fallback_strategy: {
    if_discovery_fails: "prompt_user_to_open_any_chat",
    reason: "need_legitimate_request_to_analyze",
    user_message: "Please open any conversation to initialize the extension"
  },
  
  key_rotation_detection: {
    monitor: "API_response_status_codes",
    if_400_or_403: "trigger_rediscovery",
    max_retry: 3,
    failure_action: "notify_user_gemini_protocol_changed"
  }
}
```

##### Gemini_API_Request_Construction
```javascript
ENDPOINT: "POST https://gemini.google.com/_/BardChatUi/data/batchexecute"

HEADERS: {
  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  "X-Same-Domain": "1"
  // Cookies auto-attached by browser
}

BODY_STRUCTURE: {
  format: "URLSearchParams",
  parameters: {
    "f.req": {
      type: "double_serialized_JSON",
      construction: `
        const inner = JSON.stringify([conversationId, message_count]);
        const middle = JSON.stringify([[dynamicKey, inner, null, "generic"]]);
        const outer = JSON.stringify([null, middle]);
        return outer;
      `
    },
    "at": {
      type: "string",
      source: "extracted_SNlM0e_token"
    }
  }
}

RESPONSE_PARSING: {
  step_1: "remove_security_prefix: response.slice(5)", // Remove )]}'\n
  step_2: "first_parse: JSON.parse(cleaned_response)",
  step_3: "navigate_to_data: parsed[0][2]",
  step_4: "second_parse: JSON.parse(data_string)",
  step_5: "extract_messages: final_object.conversation_data",
  
  error_handling: {
    if_parse_fails: "log_raw_response_structure",
    action: "trigger_dynamic_key_rediscovery",
    user_notification: "Gemini structure changed, re-syncing..."
  }
}
```

#### CHATGPT_IMPLEMENTATION (MODERATE_COMPLEXITY)

```javascript
ENDPOINT: "GET https://chatgpt.com/backend-api/conversation/{conversation_id}"

HEADERS: {
  "Authorization": "Bearer {extracted_token}",
  "Content-Type": "application/json"
}

RESPONSE_STRUCTURE: {
  format: "clean_JSON",
  key_fields: {
    "mapping": "object containing all messages",
    "title": "conversation title",
    "create_time": "unix timestamp",
    "update_time": "unix timestamp"
  },
  
  message_extraction: {
    iterate: "Object.values(response.mapping)",
    filter: "message.message !== null",
    extract: {
      role: "message.message.author.role",
      content: "message.message.content.parts",
      metadata: "message.message.metadata"
    }
  }
}

RATE_LIMITING: {
  max_requests_per_minute: 20,
  implementation: "token_bucket_algorithm",
  queue_strategy: "FIFO with 3s interval between requests"
}
```

#### CLAUDE_IMPLEMENTATION (MODERATE_COMPLEXITY)

```javascript
ENDPOINT: "GET https://claude.ai/api/organizations/{org_id}/chat_conversations/{chat_id}"

AUTHENTICATION: {
  method: "cookie_based",
  required_cookies: ["session-key"],
  headers: {
    "Content-Type": "application/json"
  }
}

ORG_ID_EXTRACTION: {
  source: "current_page_URL",
  pattern: "/api/organizations/([^/]+)/",
  storage: "cache_per_session"
}

RESPONSE_STRUCTURE: {
  format: "clean_JSON",
  key_fields: {
    "chat_messages": "array of message objects",
    "name": "conversation name",
    "created_at": "ISO timestamp"
  }
}
```

### 3. UI_INTERACTION_LAYER

#### Hover_Button_System
```javascript
DESIGN_PHILOSOPHY: "native_integration_illusion"

INJECTION_STRATEGY: {
  target: "conversation_list_sidebar",
  trigger: "mouseenter event on conversation item",
  positioning: "absolute, aligned to conversation title",
  
  button_structure: {
    primary_action: {
      icon: "💾",
      label: "Save",
      behavior: "save_to_last_used_folder",
      visual_feedback: "fly_to_corner_animation"
    },
    
    secondary_actions: {
      new_folder: {
        icon: "📁+",
        behavior: "inline_folder_creation_modal"
      },
      
      custom_slots: {
        count: 3,
        user_configurable: true,
        default: ["Work", "Research", "Personal"]
      },
      
      pro_feature: {
        condition: "user.subscription === 'pro'",
        action: "batch_select_mode",
        behavior: "shift+click to multi-select conversations"
      }
    }
  },
  
  animation_specs: {
    appear: "fade_in 150ms ease-out",
    disappear: "fade_out 100ms ease-in",
    save_success: "scale_down + translate_to_icon 300ms cubic-bezier"
  }
}

CONTEXT_EXTRACTION: {
  critical: "conversation_id must be extracted from hover target",
  sources: [
    "data-conversation-id attribute",
    "href attribute pattern matching",
    "parent element data attributes"
  ],
  validation: "regex: /^[a-f0-9-]{36}$/ for UUID format"
}
```

#### Toast_Notification_System
```javascript
NOTIFICATION_FLOW: {
  on_save_click: {
    immediate: "show_processing_indicator",
    on_success: {
      message: "Saved to '{folder_name}' [Change]",
      duration: 3000,
      position: "bottom_right",
      action_button: "Change folder (opens inline selector)"
    },
    on_error: {
      message: "Failed to save. {error_reason}",
      duration: 5000,
      retry_button: true
    }
  }
}
```

### 4. MUTATION_OBSERVER_IMPLEMENTATION

#### Purpose_And_Scope
```javascript
// PRIMARY_USE: Detect new conversations in sidebar
// SECONDARY_USE: Monitor streaming message completion
// NOT_USED_FOR: Primary data extraction (API method preferred)

OBSERVER_CONFIGURATION: {
  target: "conversation_list_container",
  options: {
    childList: true,
    subtree: true,
    characterData: false, // Not needed for sidebar monitoring
    attributes: false
  },
  
  debounce: {
    delay: 200, // ms
    reason: "batch multiple rapid DOM changes"
  },
  
  callback_logic: {
    on_new_conversation_detected: "inject_hover_buttons",
    on_conversation_removed: "cleanup_event_listeners"
  }
}

MEMORY_MANAGEMENT: {
  disconnect_triggers: [
    "tab_becomes_inactive",
    "user_navigates_away_from_chat_page",
    "extension_disabled"
  ],
  
  reconnect_triggers: [
    "tab_becomes_active",
    "user_returns_to_chat_page"
  ],
  
  leak_prevention: {
    max_stored_references: 100,
    cleanup_strategy: "WeakMap for DOM element references"
  }
}
```

### 5. PERFORMANCE_OPTIMIZATION

#### Request_Queue_Manager
```javascript
QUEUE_IMPLEMENTATION: {
  structure: "priority_queue",
  
  priority_levels: {
    HIGH: "user_clicked_save_button",
    MEDIUM: "auto_categorization_request",
    LOW: "background_sync_for_pro_users"
  },
  
  rate_limiting: {
    chatgpt: {
      max_concurrent: 1,
      interval_ms: 3000,
      burst_allowance: 5
    },
    gemini: {
      max_concurrent: 1,
      interval_ms: 2000,
      burst_allowance: 3
    },
    claude: {
      max_concurrent: 2,
      interval_ms: 1500,
      burst_allowance: 10
    }
  },
  
  error_handling: {
    on_429_rate_limit: "exponential_backoff",
    on_401_unauthorized: "trigger_token_refresh",
    on_500_server_error: "retry_3_times_then_fail"
  }
}
```

#### Performance_Monitoring
```javascript
METRICS_COLLECTION: {
  track: {
    api_request_duration: "performance.now() before/after",
    dom_injection_time: "measure hover button render time",
    memory_usage: "chrome.system.memory.getInfo()",
    error_rate: "failed_requests / total_requests"
  },
  
  thresholds: {
    max_request_duration: 5000, // ms
    max_memory_usage: 100, // MB
    max_error_rate: 0.05 // 5%
  },
  
  actions_on_threshold_breach: {
    high_memory: "force_garbage_collection",
    slow_requests: "notify_user_network_issues",
    high_error_rate: "disable_auto_features"
  }
}
```

### 6. DATA_SCHEMA_VALIDATION

#### Zod_Schema_Definitions
```typescript
// PLATFORM_AGNOSTIC_SCHEMA

const MessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.number().int().positive(),
  metadata: z.object({
    model: z.string().optional(),
    finish_reason: z.string().optional(),
    tokens: z.number().optional()
  }).optional()
});

const ConversationSchema = z.object({
  id: z.string(),
  platform: z.enum(["chatgpt", "claude", "gemini"]),
  title: z.string(),
  messages: z.array(MessageSchema),
  created_at: z.number().int().positive(),
  updated_at: z.number().int().positive(),
  metadata: z.object({
    model_version: z.string().optional(),
    total_tokens: z.number().optional(),
    user_tags: z.array(z.string()).optional()
  }).optional()
});

// VALIDATION_FLOW
const validateAndTransform = (rawData, platform) => {
  try {
    const normalized = platformNormalizers[platform](rawData);
    return ConversationSchema.parse(normalized);
  } catch (error) {
    logValidationError(error, rawData);
    throw new Error(`Schema validation failed for ${platform}`);
  }
};
```

### 7. DASHBOARD_INTEGRATION

#### API_Communication_Protocol
```javascript
DASHBOARD_ENDPOINT: "https://user-dashboard.com/api/conversations"

REQUEST_STRUCTURE: {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer {dashboard_session_token}"
  },
  
  body: {
    conversation_id: "string (platform-specific)",
    platform: "chatgpt | claude | gemini",
    raw_data: "validated ConversationSchema object",
    folder_id: "string | null (null = auto-categorize)",
    user_action: "manual_save | auto_sync | batch_save"
  }
}

RESPONSE_HANDLING: {
  success: {
    status: 200,
    body: {
      saved_to_folder: "folder_name",
      conversation_url: "dashboard_url_to_view",
      ai_suggested_tags: ["tag1", "tag2"]
    },
    action: "show_success_toast"
  },
  
  error: {
    status: 401,
    reason: "dashboard_session_expired",
    action: "prompt_user_to_relogin"
  }
}
```

#### Auto_Categorization_Flow
```javascript
// GEMINI_API_INTEGRATION for folder suggestion

CATEGORIZATION_REQUEST: {
  trigger: "user_clicks_save_without_folder_selection",
  
  gemini_prompt: `
    Analyze this conversation and suggest the most appropriate folder category.
    Conversation title: {title}
    First 3 messages: {message_preview}
    
    Available folders: {user_folder_list}
    
    Respond with only the folder name.
  `,
  
  api_call: {
    endpoint: "gemini_api_via_dashboard",
    reason: "uses_user_BYOK_key_stored_in_dashboard",
    timeout: 2000 // ms
  },
  
  fallback: {
    if_timeout: "save_to_default_folder",
    if_api_error: "save_to_default_folder",
    if_invalid_response: "save_to_default_folder"
  }
}
```

### 8. SECURITY_AND_COMPLIANCE

#### Privacy_Policy_Requirements
```
DATA_HANDLING_DECLARATION:
- Extension does NOT store conversation data permanently
- All data passes through extension memory only during transfer
- No analytics or tracking of user conversations
- No third-party data sharing
- All API calls use user's own authentication tokens

PERMISSIONS_JUSTIFICATION:
- webRequest: Required to intercept authentication tokens for seamless operation
- storage: Required to cache tokens and user preferences locally
- host_permissions: Required only for specified AI platforms (ChatGPT, Claude, Gemini)
- activeTab: Required to inject UI elements into conversation pages

GDPR_COMPLIANCE:
- User data never leaves user's control
- Extension acts as transport layer only
- User can delete all data from dashboard
- No cookies set by extension
```

#### Content_Security_Policy
```javascript
MANIFEST_CSP: {
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}

CODE_REQUIREMENTS: {
  no_eval: "Absolutely forbidden",
  no_inline_scripts: "All scripts in separate files",
  no_remote_code: "All libraries bundled locally",
  
  allowed_libraries: [
    "zod (validation)",
    "turndown (HTML to Markdown conversion)",
    "dompurify (XSS prevention)"
  ]
}
```

### 9. ERROR_HANDLING_MATRIX

```javascript
ERROR_SCENARIOS: {
  platform_api_changed: {
    detection: "schema_validation_fails",
    immediate_action: "fallback_to_dom_extraction",
    background_action: "notify_developer_api",
    user_message: "Platform updated. Using compatibility mode."
  },
  
  network_failure: {
    detection: "fetch_timeout_or_network_error",
    action: "queue_for_retry",
    max_retries: 3,
    user_message: "Network issue. Will retry automatically."
  },
  
  dashboard_unreachable: {
    detection: "dashboard_api_timeout",
    action: "offer_local_export",
    user_message: "Dashboard unavailable. Download locally?"
  },
  
  token_expired: {
    detection: "401_response_from_platform",
    action: "wait_for_user_to_refresh_page",
    user_message: "Please refresh the page to continue."
  },
  
  quota_exceeded: {
    detection: "429_response",
    action: "pause_all_requests_for_60s",
    user_message: "Rate limit reached. Pausing for 1 minute."
  }
}
```

### 10. MANIFEST_V3_CONFIGURATION

```json
{
  "manifest_version": 3,
  "name": "AI Chat Organizer",
  "version": "1.0.0",
  "description": "Seamlessly organize conversations from ChatGPT, Claude, and Gemini",
  
  "permissions": [
    "storage",
    "webRequest"
  ],
  
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://user-dashboard.com/*"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["content-chatgpt.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://claude.ai/*"],
      "js": ["content-claude.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://gemini.google.com/*"],
      "js": ["content-gemini.js"],
      "run_at": "document_idle"
    }
  ],
  
  "web_accessible_resources": [
    {
      "resources": ["icons/*", "styles/*"],
      "matches": ["<all_urls>"]
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

## IMPLEMENTATION_PRIORITIES

```
PHASE_1_MVP:
1. Service Worker token interception (ChatGPT only)
2. Basic API data extraction (ChatGPT only)
3. Hover button UI injection
4. Dashboard POST integration
5. Basic error handling

PHASE_2_MULTI_PLATFORM:
1. Claude API integration
2. Gemini dynamic key discovery
3. Gemini double-parse response handler
4. Platform-agnostic schema normalization
5. Rate limiting queue system

PHASE_3_POLISH:
1. Auto-categorization with Gemini API
2. Batch save functionality
3. Pro features (auto-sync)
4. Advanced error recovery
5. Performance monitoring dashboard

PHASE_4_SCALE:
1. NotebookLM direct integration
2. Google Drive export
3. Prompt manager integration
4. Multi-language support
5. Enterprise features
```

## TESTING_STRATEGY

```javascript
CRITICAL_TEST_CASES: {
  token_extraction: {
    test: "verify token captured within 5s of page load",
    platforms: ["chatgpt", "claude", "gemini"],
    success_criteria: "token stored in chrome.storage.local"
  },
  
  api_request: {
    test: "fetch conversation by ID",
    mock_conversation_ids: {
      chatgpt: "test-uuid-chatgpt",
      claude: "test-uuid-claude",
      gemini: "test-uuid-gemini"
    },
    success_criteria: "response matches ConversationSchema"
  },
  
  ui_injection: {
    test: "hover buttons appear on conversation list",
    success_criteria: "buttons visible within 200ms of hover"
  },
  
  rate_limiting: {
    test: "send 50 requests rapidly",
    success_criteria: "no more than 20 requests/minute executed"
  },
  
  error_recovery: {
    test: "simulate 401 error",
    success_criteria: "user prompted to refresh, no crash"
  }
}
```

## PERFORMANCE_BENCHMARKS

```
TARGET_METRICS:
- Token extraction: < 1s after page load
- API request (single conversation): < 500ms
- UI injection: < 200ms after hover
- Memory footprint: < 50MB
- CPU usage (idle): < 1%
- CPU usage (active save): < 5%

GEMINI_SPECIFIC:
- Dynamic key discovery: < 3s on first run
- Double-parse operation: < 50ms
- Response validation: < 100ms
```

## MAINTENANCE_CONSIDERATIONS

```
MONITORING_REQUIREMENTS:
1. Daily automated tests against live platforms
2. Schema validation error logging
3. API endpoint availability checks
4. User error report aggregation

UPDATE_TRIGGERS:
1. Platform UI redesign detected
2. API endpoint changes
3. Authentication method changes
4. New platform features (e.g., image generation)

BACKWARD_COMPATIBILITY:
- Maintain support for conversations created with old schemas
- Graceful degradation if dashboard API version mismatches
- Migration scripts for major schema changes
```

---

## GEMINI_SPECIFIC_DEEP_DIVE

### Complete_Gemini_Workflow

```javascript
// STEP 1: Extract AT Token
function extractGeminiToken() {
  // Injected via content script
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const token = window.WIZ_global_data?.SNlM0e;
      if (token) {
        window.postMessage({ type: 'GEMINI_TOKEN', token }, '*');
      }
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// STEP 2: Listen for token
window.addEventListener('message', (event) => {
  if (event.data.type === 'GEMINI_TOKEN') {
    chrome.runtime.sendMessage({
      action: 'store_gemini_token',
      token: event.data.token
    });
  }
});

// STEP 3: Dynamic Key Discovery (Service Worker)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'POST' && details.requestBody) {
      const formData = details.requestBody.formData;
      if (formData && formData['f.req']) {
        const reqData = formData['f.req'][0];
        const match = reqData.match(/"([a-zA-Z0-9]{5,6})"/);
        if (match) {
          chrome.storage.local.set({ 
            gemini_dynamic_key: match[1],
            key_discovered_at: Date.now()
          });
        }
      }
    }
  },
  { urls: ['https://gemini.google.com/_/BardChatUi/data/batchexecute'] },
  ['requestBody']
);

// STEP 4: Construct Request
async function fetchGeminiConversation(conversationId) {
  const { gemini_at_token, gemini_dynamic_key } = 
    await chrome.storage.local.get(['gemini_at_token', 'gemini_dynamic_key']);
  
  if (!gemini_at_token || !gemini_dynamic_key) {
    throw new Error('Gemini not initialized');
  }
  
  const innerPayload = JSON.stringify([conversationId, 100]);
  const middlePayload = JSON.stringify([
    [gemini_dynamic_key, innerPayload, null, "generic"]
  ]);
  const outerPayload = JSON.stringify([null, middlePayload]);
  
  const body = new URLSearchParams({
    'f.req': outerPayload,
    'at': gemini_at_token
  });
  
  const response = await fetch(
    'https://gemini.google.com/_/BardChatUi/data/batchexecute',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-Same-Domain': '1'
      },
      body: body.toString()
    }
  );
  
  return response.text();
}

// STEP 5: Parse Response
function parseGeminiResponse(rawText) {
  // Remove security prefix
  const cleaned = rawText.slice(5);
  
  // First parse
  const firstLevel = JSON.parse(cleaned);
  
  // Navigate to data
  const dataString = firstLevel[0][2];
  
  // Second parse
  const secondLevel = JSON.parse(dataString);
  
  // Extract conversation
  return secondLevel; // Structure varies, needs schema validation
}

// STEP 6: Validate and Send to Dashboard
async function processGeminiConversation(conversationId) {
  try {
    const rawResponse = await fetchGeminiConversation(conversationId);
    const parsed = parseGeminiResponse(rawResponse);
    const validated = ConversationSchema.parse(
      normalizeGeminiData(parsed)
    );
    
    await sendToDashboard(validated);
    showSuccessToast('Saved to dashboard');
  } catch (error) {
    if (error.message.includes('validation')) {
      // Schema changed, trigger alert
      notifyDeveloper('Gemini schema changed', error);
    }
    showErrorToast('Failed to save conversation');
  }
}
```

## FINAL_IMPLEMENTATION_NOTES

```
CRITICAL_SUCCESS_FACTORS:
1. Gemini dynamic key discovery MUST be robust
2. Rate limiting MUST prevent account bans
3. UI MUST feel native to each platform
4. Error messages MUST be user-friendly
5. Performance MUST not degrade platform experience

KNOWN_RISKS:
1. Platforms may detect and block extension
2. API structures change without notice
3. Rate limits may be stricter than documented
4. CORS policies may change
5. Authentication methods may evolve

MITIGATION_STRATEGIES:
1. Implement feature flags for quick disable
2. Maintain fallback DOM extraction methods
3. Build community reporting system
4. Keep extension logic modular for quick updates
5. Maintain open communication with user base
```
