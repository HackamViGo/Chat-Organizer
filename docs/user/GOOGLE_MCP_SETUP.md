# 🔧 Google Developer Knowledge MCP - Setup Instructions

## ✅ MCP Configuration Added

**Location:** `/home/stefanov/.gemini/antigravity/mcp_config.json`

**Status:** ⚠️ DISABLED (needs API key)

---

## 📋 Enable Steps

### Step 1: Get Google API Key

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create API Key
3. Restrict to "Developer Knowledge API"
4. Copy the key

### Step 2: Add API Key to mcp_config.json

```bash
# Open config
nano /home/stefanov/.gemini/antigravity/mcp_config.json

# Find "google-developer-knowledge" section
# Replace "YOUR_GOOGLE_API_KEY_HERE" with your actual key

# Change "disabled": true to "disabled": false
```

### Step 3: Restart Antigravity

Close and reopen Antigravity to load the new MCP server.

---

## 🧪 Test MCP

After enabling, test with:

```
Query the latest Chrome alarms API documentation
```

Expected: Agent should call `@mcp:google-developer-knowledge` and return fresh Chrome API docs.

---

## 📊 Current MCP Config

```json
{
  "google-developer-knowledge": {
    "command": "npx",
    "args": [
      "-y",
      "@google/mcp-server-developer-knowledge"
    ],
    "env": {
      "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY_HERE"
    },
    "disabled": true,
    "disabledTools": []
  }
}
```

---

## ⚠️ Important

- **Disabled by default** - enable only when you have API key
- **Smart routing** - only used for Chrome/Gemini APIs
- **Context7 fallback** - everything else uses Context7

---

**Next:** Add API key → Enable → Test with full system!
