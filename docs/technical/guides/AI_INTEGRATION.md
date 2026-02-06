# AI Платформи - Интеграция & Reverse Engineering Guide

**Дата:** 02.02.2026  
**Версия:** 1.0  
**Статус:** Production Ready

---

## 📋 Съдържание

1. [Краток преглед](#краток-преглед)
2. [Grok (xAI)](#grok-xai)
3. [Perplexity AI](#perplexity-ai)
4. [DeepSeek](#deepseek)
5. [Qwen (Alibaba)](#qwen-alibaba)
6. [LMArena](#lmarena)
7. [Архитектура и имплементация](#архитектура-и-имплементация)
8. [Security & Best Practices](#security--best-practices)
9. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## 🎯 Краток Преглед

### Платформи - Матрица

| Платформа | API | Auth | Streaming | Citations | Cost/1M | Rate Limit |
|-----------|-----|------|-----------|-----------|---------|------------|
| **Grok** | ✅ | Bearer JWT | SSE | ❌ | $10 | 60 RPM |
| **Perplexity** | ✅ | Bearer | SSE | ✅ | $3 | 20 RPM |
| **DeepSeek** | ✅ | Bearer | SSE | ❌ | $0.69 | 60 RPM |
| **Qwen** | ✅ | Bearer | SSE | ❌ | $0.75 | 100 RPM |
| **LMArena** | ❌ | Session | WS | ❌ | Free | N/A |

---

## 🚀 Grok (xAI)

### Автентикация

```
Token Type: Bearer JWT
Header: Authorization: Bearer xai-xxxxxxxxxxxxxxxx
Base URL: https://api.x.ai/v1
```

### Основни Endpoints

#### Chat Completion
```http
POST https://api.x.ai/v1/chat/completions
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "model": "grok-4",
  "messages": [
    {
      "role": "system",
      "content": "You are Grok, a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2048
}
```

#### Response Schema
```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1715688169,
  "model": "grok-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The answer is 42..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 100,
    "total_tokens": 150
  }
}
```

### Browser Integration

**Platform Detection:**
- Domain: `grok.x.ai` або `grok.com`

**UI Селектори:**
```css
/* Input */
textarea[placeholder*="Ask"]
div[contenteditable="true"][role="textbox"]

/* Send Button */
button[type="submit"]
button[class*="send"]
```

### Streaming

```javascript
const response = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'grok-4',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
  
  for (const line of lines) {
    const data = line.replace('data: ', '');
    if (data === '[DONE]') break;
    
    const json = JSON.parse(data);
    const content = json.choices[0].delta.content;
    if (content) console.log(content);
  }
}
```

### cURL Example

```bash
curl https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

---

## 🔍 Perplexity AI

### Автентикация

```
Token Type: Bearer Token
Header: Authorization: Bearer pplx-xxxxxxxxxxxxxxxx
API URL: https://api.perplexity.ai
Browser URL: https://www.perplexity.ai
```

### API Endpoints

#### Chat Completions
```http
POST https://api.perplexity.ai/chat/completions
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "model": "sonar-medium-online",
  "messages": [
    {
      "role": "user",
      "content": "What are the latest AI developments?"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "return_citations": true,
  "search_domain_filter": ["perplexity.ai"],
  "search_recency_filter": "month"
}
```

#### Response dengan Citations
```json
{
  "id": "response-id",
  "model": "sonar-medium-online",
  "object": "chat.completion",
  "created": 1234567890,
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Based on recent data..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 200,
    "total_tokens": 250
  },
  "citations": [
    "https://example.com/source1",
    "https://example.com/source2"
  ]
}
```

### Browser Endpoint (Web Interface)

```http
POST https://www.perplexity.ai/rest/sse/perplexity_ask
Content-Type: application/json

{
  "query_str": "Your question here",
  "model_preference": "pplx_pro",
  "search_focus": "internet",
  "mode": "concise",
  "language": "en"
}
```

**Search Focus Options:**
- `internet` - Web search
- `academic` - Academic papers
- `news` - News articles
- `youtube` - Video content
- `reddit` - Reddit discussions

### UI Селектори

```css
/* Input */
textarea[class*="search"]
textarea[placeholder*="Ask"]
div[contenteditable="true"][class*="search"]

/* Send Button */
button[aria-label*="Search"]
button[class*="search-submit"]
```

### cURL Example

```bash
curl https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar-medium-online",
    "messages": [{"role": "user", "content": "Hello"}],
    "return_citations": true
  }'
```

---

## 🔧 DeepSeek

### Автентикация

```
Token Type: Bearer Token
Header: Authorization: Bearer {API_KEY}
Base URL: https://api.deepseek.com
Web: https://chat.deepseek.com
```

⚠️ **Security Warning:** January 2025 data leak exposed 1M+ records. Use proxy layer and rotate keys frequently.

### Chat API

```http
POST https://api.deepseek.com/chat/completions
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant"
    },
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2048
}
```

### Available Models

- `deepseek-chat` - General purpose chat
- `deepseek-reasoner` - Reasoning/R1 model
- `deepseek-coder` - Code generation specialist

### Response

```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

### Multi-turn Conversation

```python
from openai import OpenAI

client = OpenAI(
    api_key="<DeepSeek API Key>",
    base_url="https://api.deepseek.com"
)

messages = [
    {"role": "user", "content": "What's the highest mountain?"}
]

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=messages
)

messages.append(response.choices[0].message)

# Follow-up question
messages.append({"role": "user", "content": "What is the second?"})
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=messages
)
```

### UI Селектори

```css
/* Input */
textarea#chat-input
textarea[placeholder*="Message"]

/* Send Button */
button[type="submit"]
button[class*="send-button"]
button[aria-label*="Send"]
```

### cURL Example

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 🤖 Qwen (Alibaba)

### Автентикация

```
Token Type: Bearer Token / OAuth
Provider 1: Alibaba Cloud DashScope
Provider 2: Together.ai
```

### Alibaba DashScope API

```http
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "model": "Qwen/Qwen2.5-72B-Instruct-Turbo",
  "messages": [
    {
      "role": "user",
      "content": "What are some fun things to do?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

### Together.ai API

```http
POST https://api.together.xyz/v1/chat/completions
Authorization: Bearer {TOGETHER_API_KEY}
Content-Type: application/json

{
  "model": "Qwen/Qwen2.5-72B-Instruct-Turbo",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}
```

### Available Models

- `Qwen/Qwen2.5-72B-Instruct-Turbo`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `qwen3-coder-plus` (Coding specialized)

### Environment Setup

```bash
export OPENAI_API_KEY="your-qwen-key"
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen3-coder-plus"
```

### Python Example

```python
import openai

openai.api_key = "your-key"
openai.api_base = "https://dashscope.aliyuncs.com/compatible-mode/v1"

response = openai.ChatCompletion.create(
    model="Qwen/Qwen2.5-72B-Instruct-Turbo",
    messages=[
        {"role": "user", "content": "Write Python fibonacci function"}
    ]
)

print(response.choices[0].message.content)
```

### cURL Example

```bash
curl https://api.together.xyz/v1/chat/completions \
  -H "Authorization: Bearer $TOGETHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-72B-Instruct-Turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## 🏆 LMArena

### Platform Overview

**Important:** LMArena does NOT provide a public API. Browser automation is required.

### Endpoints (Reverse Engineering)

```
Main: https://lmarena.ai
Arena: https://lmarena.ai/arena
Chat: https://lmarena.ai/chat
```

### Authentication

- Session-based (cookies)
- No API keys
- Anonymous access available

### UI Селектори

```css
/* Input */
textarea[placeholder*="Enter"]
textarea[class*="chat-input"]
div[contenteditable="true"]

/* Send Button */
button[type="submit"]
button[class*="send"]

/* Model Vote Buttons */
button[class*="vote"]
button[data-model*="left"]
button[data-model*="right"]
```

### Browser Automation (Puppeteer)

```javascript
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

// Monitor WebSocket
await page.evaluateOnNewDocument(() => {
  window.capturedMessages = [];
  
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(...args) {
    const ws = new originalWebSocket(...args);
    ws.addEventListener('message', (event) => {
      window.capturedMessages.push({
        type: 'message',
        data: event.data,
        timestamp: Date.now()
      });
    });
    return ws;
  };
});

await page.goto('https://lmarena.ai/arena');
await page.waitForSelector('textarea');

// Send message
const prompt = 'Explain quantum computing in simple terms';
await page.type('textarea', prompt);
await page.click('button[type="submit"]');

// Wait for responses
await page.waitForTimeout(10000);

// Extract responses
const leftResponse = await page.$eval(
  '.response-left',
  el => el.textContent
);
const rightResponse = await page.$eval(
  '.response-right',
  el => el.textContent
);

console.log('Model A:', leftResponse);
console.log('Model B:', rightResponse);

await browser.close();
```

---

## 🏗️ Архитектура и имплементация

### System Architecture

```
┌─────────────────────────────────┐
│   Corporate Application         │
│  (Browser Extension / CLI)      │
└─────────────────────────────────┘
            ↓
┌─────────────────────────────────┐
│   Unified API Gateway           │
│  - Token Management             │
│  - Rate Limiting                │
│  - Response Normalization       │
└─────────────────────────────────┘
     ↓    ↓    ↓    ↓    ↓
  Grok Pplx Deep Qwen Arena
     ↓    ↓    ↓    ↓    ↓
┌─────────────────────────────────┐
│  Conversation Database          │
│  (PostgreSQL/MongoDB)           │
└─────────────────────────────────┘
```

### Database Schema

```sql
-- Conversations Table
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  INDEX idx_user_platform (user_id, platform)
);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  INDEX idx_conv_time (conversation_id, created_at)
);

-- API Usage Table
CREATE TABLE api_usage (
  id UUID PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  latency_ms INTEGER,
  status_code INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_date (user_id, timestamp)
);
```

### Unified API Client (JavaScript)

```javascript
class UnifiedAIClient {
  constructor(platform) {
    this.platform = platform;
    this.config = {
      grok: {
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
        model: 'grok-4'
      },
      perplexity: {
        apiKey: process.env.PERPLEXITY_API_KEY,
        baseURL: 'https://api.perplexity.ai',
        model: 'sonar-medium-online'
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      },
      qwen: {
        apiKey: process.env.QWEN_API_KEY,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen3-coder-plus'
      }
    };
    
    if (!this.config[platform]) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  
  async chat(messages, options = {}) {
    const cfg = this.config[this.platform];
    const url = `${cfg.baseURL}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || cfg.model,
        messages: messages,
        stream: options.stream || false,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async *streamChat(messages, options = {}) {
    const cfg = this.config[this.platform];
    const url = `${cfg.baseURL}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || cfg.model,
        messages: messages,
        stream: true,
        temperature: options.temperature || 0.7
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const json = JSON.parse(data);
          const content = json.choices[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          console.error('Parse error:', e);
        }
      }
    }
  }
}

// Usage
const client = new UnifiedAIClient('grok');

// Simple chat
const response = await client.chat([
  { role: 'user', content: 'Hello!' }
]);

// Streaming
for await (const chunk of client.streamChat([...])) {
  process.stdout.write(chunk);
}
```

---

## 🔒 Security & Best Practices

### Environment Variables

```bash
# .env file
XAI_API_KEY=xai-your-key-here
PERPLEXITY_API_KEY=pplx-your-key-here
DEEPSEEK_API_KEY=your-key-here
QWEN_API_KEY=your-key-here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_conversations
DB_USER=app_user
DB_PASSWORD=secure-password
```

### Rate Limiting

```javascript
class RateLimiter {
  constructor() {
    this.limits = {
      grok: { rpm: 60 },
      perplexity: { rpm: 20 },
      deepseek: { rpm: 60 },
      qwen: { rpm: 100 }
    };
    this.usage = new Map();
  }
  
  async checkLimit(platform) {
    const limit = this.limits[platform];
    const usage = this.getUsage(platform);
    
    if (usage.requests >= limit.rpm) {
      const waitTime = usage.resetAt - Date.now();
      throw new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
    }
    
    usage.requests++;
    return true;
  }
  
  getUsage(platform) {
    if (!this.usage.has(platform)) {
      this.usage.set(platform, {
        requests: 0,
        resetAt: Date.now() + 60000
      });
    }
    
    const usage = this.usage.get(platform);
    
    if (Date.now() >= usage.resetAt) {
      usage.requests = 0;
      usage.resetAt = Date.now() + 60000;
    }
    
    return usage;
  }
}
```

### Token Rotation

```javascript
class TokenManager {
  constructor() {
    this.tokens = new Map();
    this.rotationInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
  }
  
  async getToken(platform) {
    const token = this.tokens.get(platform);
    
    if (!token || this.isExpired(token)) {
      return await this.rotateToken(platform);
    }
    
    return token.value;
  }
  
  isExpired(token) {
    return Date.now() - token.created > this.rotationInterval;
  }
  
  async rotateToken(platform) {
    const newToken = await this.fetchFromVault(platform);
    this.tokens.set(platform, {
      value: newToken,
      created: Date.now()
    });
    return newToken;
  }
  
  async fetchFromVault(platform) {
    // Integration with AWS Secrets Manager, HashiCorp Vault, etc.
    // Implementation depends on your infrastructure
    throw new Error('Implement vault integration');
  }
}
```

### Audit Logging

```javascript
class AuditLogger {
  constructor(db) {
    this.db = db;
  }
  
  async logRequest(platform, userId, action, metadata = {}) {
    await this.db.query(`
      INSERT INTO api_audit_log 
      (platform, user_id, action, metadata, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [platform, userId, action, JSON.stringify(metadata)]);
  }
  
  async logCost(platform, userId, tokensUsed, costUsd) {
    await this.db.query(`
      INSERT INTO api_usage
      (platform, user_id, tokens_used, cost_usd, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [platform, userId, tokensUsed, costUsd]);
  }
}
```

### Security Checklist

- [ ] Never commit API keys to git
- [ ] Use environment variables for secrets
- [ ] Rotate keys every 30 days
- [ ] Implement rate limiting
- [ ] Enable audit logging
- [ ] Use HTTPS only
- [ ] Validate all inputs
- [ ] Sanitize user prompts
- [ ] Monitor for unusual activity
- [ ] Encrypt sensitive data at rest
- [ ] Use proxy layer for DeepSeek (security issue)

---

## 🐛 Debugging & Troubleshooting

### Network Inspection

```bash
# Monitor API calls in Chrome DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by: Fetch/XHR
4. Look for endpoints:
   - /chat/completions
   - /rest/sse/perplexity_ask
5. Copy as cURL to test locally
```

### Common Issues

#### API Key Not Working

```bash
# Check if key is set
echo $XAI_API_KEY

# Test with curl
curl -v https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-4","messages":[{"role":"user","content":"test"}]}'
```

#### Rate Limit Exceeded

```javascript
// Implement exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('rate limit')) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Rate limited. Waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Usage
const response = await retryWithBackoff(() => 
  client.chat(messages)
);
```

#### CORS Errors (Browser)

```javascript
// ❌ Wrong - Browser will block
fetch('https://api.x.ai/v1/chat/completions', {...})

// ✅ Correct - Use background script
chrome.runtime.sendMessage({
  action: 'chat',
  platform: 'grok',
  messages: [...]
}, (response) => {
  console.log(response);
});
```

#### Streaming Not Working

```javascript
// Check response headers
const response = await fetch(url, { method: 'POST', ... });

console.log('Content-Type:', response.headers.get('content-type'));
console.log('Transfer-Encoding:', response.headers.get('transfer-encoding'));

// Verify stream parameter
const body = { ..., stream: true }; // Must be true
```

#### UI Selectors Not Found

```javascript
// Use Chrome DevTools to find correct selectors
// 1. Open DevTools Inspector
// 2. Right-click on input field
// 3. Click "Inspect"
// 4. Copy the element's classes/IDs

// Test selector
const input = document.querySelector('textarea[placeholder*="Ask"]');
console.log('Found:', input !== null);

// Fallback with multiple selectors
const selectors = [
  'textarea[placeholder*="Ask"]',
  'textarea.chat-input',
  'div[contenteditable="true"]'
];

const input = selectors
  .map(s => document.querySelector(s))
  .find(el => el !== null);
```

### Browser Extension Debugging

```javascript
// In content script
console.log('Platform detected:', detectPlatform());
console.log('UI injected:', document.getElementById('corporate-toolbar') !== null);

// In background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message from:', sender.url);
  console.log('Action:', message.action);
  console.log('Data:', message.data);
});

// Monitor API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0]);
  return originalFetch.apply(this, args);
};
```

---

## 📦 Required Packages

```bash
# Install dependencies
npm install \
  openai \
  axios \
  puppeteer \
  ws \
  eventsource \
  dotenv \
  postgres

# For TypeScript projects
npm install --save-dev @types/node
```

---

## 💰 Cost Analysis

### Per 1M Tokens (Feb 2026)

| Platform | Input | Output | Average |
|----------|-------|--------|---------|
| Grok | $5 | $15 | $10 |
| Perplexity | $1 | $5 | $3 |
| DeepSeek | $0.27 | $1.10 | $0.69 |
| Qwen | $0.30 | $1.20 | $0.75 |
| LMArena | Free | Free | Free |

### Monthly Budget Example

Assumptions:
- 10,000 queries/month
- Average 500 tokens per query (250 in + 250 out)
- Total: 5M tokens/month

Monthly costs:
- **Grok:** 5M × $10 = **$50**
- **Perplexity:** 5M × $3 = **$15**
- **DeepSeek:** 5M × $0.69 = **$3.45**
- **Qwen:** 5M × $0.75 = **$3.75**
- **LMArena:** **Free** (no API)

**Total with all 5 platforms:** ~$72/month

---

## 🔗 Resources

### Official Documentation
- Grok: https://docs.x.ai
- Perplexity: https://docs.perplexity.ai
- DeepSeek: https://api-docs.deepseek.com
- Qwen: https://qwenlm.github.io

### Tools
- Postman: API testing
- Puppeteer: Browser automation
- Chrome DevTools: Network inspection
- VS Code REST Client: cURL testing

### Community
- Reddit: r/LocalLLaMA, r/MachineLearning
- GitHub: ppl-ai/api-discussion
- Discord: AI Developers Community

---

## 📝 Chrome Extension Manifest Template

```json
{
  "manifest_version": 3,
  "name": "AI Platforms Integration",
  "version": "1.0.0",
  "description": "Unified interface for multiple AI platforms",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://grok.x.ai/*",
    "https://perplexity.ai/*",
    "https://chat.deepseek.com/*",
    "https://qwen.ai/*",
    "https://lmarena.ai/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://grok.x.ai/*",
        "https://perplexity.ai/*",
        "https://chat.deepseek.com/*",
        "https://qwen.ai/*",
        "https://lmarena.ai/*"
      ],
      "js": ["content-script.js"],
      "css": ["styles.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "AI Integration"
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: Setup
- [ ] Create .env file with API keys
- [ ] Test each platform with curl
- [ ] Setup database schema
- [ ] Configure rate limiter

### Phase 2: API Integration
- [ ] Implement UnifiedAIClient class
- [ ] Test all platform endpoints
- [ ] Setup response normalization
- [ ] Implement streaming

### Phase 3: Browser Extension
- [ ] Create manifest.json
- [ ] Implement platform detection
- [ ] Create UI injection logic
- [ ] Add conversation extraction

### Phase 4: Storage & Analytics
- [ ] Setup conversation database
- [ ] Implement audit logging
- [ ] Add cost tracking
- [ ] Create analytics dashboard

### Phase 5: Security
- [ ] Setup token rotation
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Enable encryption at rest
- [ ] Deploy proxy layer for DeepSeek

### Phase 6: Testing & Deployment
- [ ] Unit tests for each client
- [ ] Integration tests with APIs
- [ ] Load testing
- [ ] Security audit
- [ ] Production deployment

---

## 📞 Support

For issues:
1. Check this documentation
2. Inspect network traffic in DevTools
3. Review API documentation for the platform
4. Check GitHub issues for similar problems
5. Contact platform support if needed

---

**Версия:** 1.0  
**Дата:** 02.02.2026  
**Статус:** Production Ready  
**Лиценз:** Internal Use Only

Успешна имплементация! 🚀
