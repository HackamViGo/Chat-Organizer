# MCP Usage Rules — Mandatory Protocol

## Core Principle
**Repo truth > External docs > Assumptions > Guessing**

Every agent action must be grounded in verifiable evidence.

---

## Evidence Hierarchy

### 1. Repo Truth (Highest Priority)
```
Source: Filesystem MCP → read actual code
When:   ALWAYS check code first before making claims

Examples:
  ✅ Read normalizers.ts to see what normalizeGemini actually does
  ✅ Read manifest.json to see actual permissions
  ✅ Read dashboardApi.ts to see actual fetch calls
  
  ❌ Don't say "normalizeGemini probably does X"
  ❌ Don't assume manifest has a permission without checking
```

### 2. Runtime Evidence (Second Priority)
```
Source: Terminal MCP → pnpm test, pnpm build
        Browser MCP → Playwright verification
When:   After code changes, verify they work

Examples:
  ✅ Run pnpm test after modifying normalizers
  ✅ Run pnpm build to verify no TypeScript errors
  ✅ Load extension in browser to verify it starts
  
  ❌ Don't say "this should work" without running it
  ❌ Don't claim tests pass without executing them
```

### 3. Official Documentation (Third Priority)
```
Source: Context7 MCP → chrome API docs, Vite docs, etc.
When:   When implementing new APIs or unsure about behavior

Examples:
  ✅ Look up chrome.webRequest.onBeforeSendHeaders signature
  ✅ Verify CRXJS manifest format
  ✅ Check Playwright extension loading API
  
  ❌ Don't use Stack Overflow answers without Context7 verification
  ❌ Don't rely on outdated blog posts
```

### 4. Internal Documentation (Fourth Priority)
```
Source: Filesystem MCP → docs/user/New_EXT/, .agent/
When:   For project-specific patterns and contracts

Examples:
  ✅ Read Master Document for save flow sequence
  ✅ Read TROUBLESHOOTING_BG.md for known issues
  ✅ Read .agent/rules/ for coding standards
```

### 5. Inference (Last Resort)
```
When: All above sources exhausted
Must: Mark explicitly as inference

Format:
  "⚠️ INFERENCE: Based on [evidence], I believe [conclusion].
   Verification needed: [how to verify]"
```

---

## Verification Requirements

### Before Claiming Success
```
Every completed task must have EITHER:

Option A: Code diff + test evidence
  1. Show the actual code change (diff or full file)
  2. Show test results (pnpm test output)
  3. Show build results (pnpm build output)

Option B: Runtime verification
  1. Show the command executed
  2. Show the output
  3. Confirm expected behavior observed

NEVER claim success with only:
  ❌ "I've updated the file" (without showing content)
  ❌ "This should work" (without testing)
  ❌ "The test would pass" (without running it)
```

### Before Making Changes
```
Pre-flight checklist:
  1. □ Read the current file content (Filesystem)
  2. □ Understand what it does (analyze imports, exports)
  3. □ Check who owns the file (.agent/rules/)
  4. □ Verify the API/interface hasn't changed (Context7 if external)
  5. □ Plan the change
  6. □ Execute
  7. □ Verify (Terminal: test/build)
```

---

## Anti-Patterns

### The Confident Hallucination
```
❌ "chrome.webRequest can read response bodies in MV3"
   Reality: It cannot. This was removed in MV3.
   Prevention: Context7 lookup before claiming API capabilities.
```

### The Assumption Cascade
```
❌ "Since ChatGPT uses Bearer tokens, Grok probably does too"
   Reality: Grok uses CSRF + Auth dual tokens.
   Prevention: Read each adapter file individually.
```

### The Untested Completion
```
❌ "I've added the Claude adapter. Phase 2 is complete."
   Without: Running tests, building, or loading in browser.
   Prevention: Always run pnpm test && pnpm build after changes.
```

### The Stale Reference
```
❌ Using legacy extension code patterns for v3
   Reality: v3 has different architecture (bridges, no DOM).
   Prevention: Always reference apps/extension_v3/, not apps/extension/.
```
