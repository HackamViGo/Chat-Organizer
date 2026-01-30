#!/bin/bash
# BrainBox - Agent System Setup Script

echo "🧠 Setting up BrainBox Multi-Agent System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create directory structure
echo "📁 Creating directory structure..."

mkdir -p .cursor/rules
mkdir -p logs
mkdir -p docs/agents
mkdir -p tests

echo -e "${GREEN}✓${NC} Directories created"

# Create log files
echo ""
echo "📝 Creating agent log files..."

touch logs/db_agent.log
touch logs/ui_agent.log
touch logs/api_agent.log
touch logs/extension_agent.log
touch logs/test_agent.log

# Add headers to log files
for log in logs/*_agent.log; do
  agent=$(basename "$log" .log | tr '_' ' ' | awk '{print toupper($1)}')
  echo "# BrainBox ${agent} Log" > "$log"
  echo "# Format: [TIMESTAMP] [ACTION] [STATUS] [DETAILS]" >> "$log"
  echo "# Language: English only" >> "$log"
  echo "" >> "$log"
done

echo -e "${GREEN}✓${NC} Log files created"

# Create agent documentation files
echo ""
echo "📚 Creating agent documentation..."

cat > docs/agents/db_agent.md << 'EOF'
# Database Agent - Personal Documentation

**Agent:** DB_AGENT  
**Role:** Database Architecture & Management via MCP  
**Log:** `logs/db_agent.log`

---

## What Works

### RLS Policies
- User isolation: `auth.uid() = user_id` - WORKS
- Cascade deletes: `ON DELETE CASCADE` - WORKS

### Type Generation
- Command: `npx supabase gen types` - WORKS
- Auto-updates database.types.ts

---

## What Doesn't Work

### Issue: Circular foreign keys
**Problem:** Can't reference folders.parent_id to itself during creation  
**Solution:** Create table first, add constraint after

---

## MCP Commands Used

```sql
-- Create table
CREATE TABLE ...

-- Enable RLS
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY ...

-- Test query
SELECT * FROM ... WHERE user_id = ...;
```

---

## Schema Decisions

- All tables have `user_id` for RLS
- All timestamps use `timezone('utc'::text, now())`
- Soft delete via `is_archived` where needed

---

*Last updated: 2025-01-15*
EOF

cat > docs/agents/api_agent.md << 'EOF'
# API Agent - Personal Documentation

**Agent:** API_AGENT  
**Role:** Backend API Development  
**Log:** `logs/api_agent.log`

---

## What Works

### Authentication Check Pattern
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
**Status:** WORKS - Used in all routes

---

### Supabase Query Pattern
```typescript
const { data, error } = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', user.id);
```
**Status:** WORKS - RLS automatically filters

---

## What Doesn't Work

### Issue: CORS on extension requests
**Problem:** Extension couldn't send cookies  
**Solution:** Added `credentials: 'include'` in fetch

---

### Issue: Large request bodies
**Problem:** Image uploads fail for >1MB  
**Solution:** Increased body size limit in next.config.js

---

## API Endpoints Created

```
✓ GET  /api/chats
✓ POST /api/chats
✓ GET  /api/chats/extension
✓ GET  /api/folders
✓ POST /api/folders
✓ POST /api/ai/generate
```

---

## Error Handling Pattern

```typescript
try {
  // Operation
  return NextResponse.json({ success: true, data });
} catch (error) {
  console.error('[API] Error:', error);
  return NextResponse.json(
    { error: error.message || 'Internal error' },
    { status: 500 }
  );
}
```

---

*Last updated: 2025-01-15*
EOF

cat > docs/agents/extension_agent.md << 'EOF'
# Extension Agent - Personal Documentation

**Agent:** EXTENSION_AGENT  
**Role:** Chrome Extension Development  
**Log:** `logs/extension_agent.log`

---

## What Works

### Context Menu Integration
```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-to-brainbox') {
    handleSave(tab);
  }
});
```
**Status:** WORKS - Universal across all AI platforms

---

### Platform Detection
```javascript
const platform = 
  url.includes('chatgpt.com') ? 'chatgpt' :
  url.includes('claude.ai') ? 'claude' :
  url.includes('gemini.google.com') ? 'gemini' :
  'lmarena';
```
**Status:** WORKS on all 4 platforms

---

## What Doesn't Work

### Issue: Dynamic Content Loading
**Problem:** Some platforms lazy-load conversation history  
**Solution:** Prompt user to scroll up if ID is not found in URL or DOM

---

## Size History

```
2025-01-15: 21.2KB ✓
2025-01-10: 23.8KB ✓
2025-01-05: 19.5KB ✓
```

Target: < 25KB

---

## Platform-Specific Notes

### ChatGPT
- Fastest DOM structure
- Message streaming supported
- Code blocks well-formatted

### Claude
- Clean HTML structure
- Good for extraction
- Sometimes lazy-loads content

### Gemini
- Similar to ChatGPT
- Different class names
- Good image support

### LMArena
- Two-column layout
- Need to detect active side
- Comparison mode tricky

---

*Last updated: 2025-01-15*
EOF

echo -e "${GREEN}✓${NC} Agent documentation created"

# Create .cursor/rules files structure info
echo ""
echo "📋 Rules file structure:"
echo "  .cursor/rules/extension.md  - Extension-specific rules"
echo "  .cursor/rules/database.md   - Database-specific rules"
echo "  .cursor/rules/typescript.md - TypeScript rules"
echo ""
echo -e "${YELLOW}Note:${NC} Create these files manually from artifacts"

# Create initial agent_document.md
echo ""
echo "📄 Creating agent coordination document..."

cat > docs/agent_document.md << 'EOF'
# BrainBox - Agent Coordination Document

**Purpose:** Cross-agent communication and synchronization  
**Language:** English only  
**Format:** Optimized for AI parsing

---

## Active Tasks

### PENDING
*Tasks awaiting action from specific agents*

```
[Empty - No pending tasks]
```

---

## Recent Changes

### YYYY-MM-DD

#### HH:MM:SS - [AGENT_NAME] Change Description
**Action:** What was done  
**Status:** PENDING | COMPLETED | FAILED  
**Impact:**
- AGENT_NAME: What they need to know/do

**Acknowledgments:**
- [TIMESTAMP] [AGENT_NAME] ACKNOWLEDGED

---

*Last updated: [TIMESTAMP]*  
*Document version: 1.0.0*
EOF

echo -e "${GREEN}✓${NC} Coordination document created"

# Create test structure
echo ""
echo "🧪 Creating test structure..."

mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e

cat > tests/README.md << 'EOF'
# BrainBox Tests

## Structure

```
tests/
├── unit/           - Unit tests for functions
├── integration/    - API and database integration tests
└── e2e/            - End-to-end tests
```

## Running Tests

```bash
npm test              # Run all tests
npm test:unit         # Unit tests only
npm test:integration  # Integration tests only
npm test:e2e          # E2E tests only
```

## Writing Tests

Each test file should be in its own subdirectory:
```
tests/unit/chat-utils/
  ├── formatChat.test.ts
  └── validateChat.test.ts
```
EOF

echo -e "${GREEN}✓${NC} Test structure created"

# Create Git hooks
echo ""
echo "🔗 Creating Git hooks..."

cat > setup-hooks.sh << 'EOF'
#!/bin/bash
# Git hooks for BrainBox

mkdir -p .git/hooks

# Pre-commit hook
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
echo "🔍 Pre-commit checks..."

# TypeScript
if ! npm run build; then
  echo "❌ Build failed"
  exit 1
fi

# Extension size
if [ -d "extension" ]; then
  SIZE=$(du -sb extension | cut -f1)
  if [ "$SIZE" -gt 25000 ]; then
    echo "⚠️  Extension size: ${SIZE} bytes (limit: 25KB)"
  fi
fi

echo "✅ Checks passed"
HOOK

chmod +x .git/hooks/pre-commit
EOF

chmod +x setup-hooks.sh

echo -e "${GREEN}✓${NC} Git hooks script created"

# Summary
echo ""
echo "═══════════════════════════════════════════"
echo "✅ BrainBox Agent System Setup Complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "Created:"
echo "  📁 Directories:"
echo "     - .cursor/rules/"
echo "     - logs/"
echo "     - docs/agents/"
echo "     - tests/"
echo ""
echo "  📝 Log files:"
echo "     - logs/db_agent.log"
echo "     - logs/ui_agent.log"
echo "     - logs/api_agent.log"
echo "     - logs/extension_agent.log"
echo "     - logs/test_agent.log"
echo ""
echo "  📚 Documentation:"
echo "     - docs/agent_document.md (coordination)"
echo "     - docs/agents/db_agent.md"
echo "     - docs/agents/api_agent.md"
echo "     - docs/agents/extension_agent.md"
echo ""
echo "  🧪 Tests:"
echo "     - tests/unit/"
echo "     - tests/integration/"
echo "     - tests/e2e/"
echo ""
echo "═══════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Create .cursor/rules/ files from artifacts:"
echo "   - extension.md"
echo "   - database.md"
echo "   - typescript.md"
echo ""
echo "2. Copy core .cursorrules from artifact"
echo ""
echo "3. Run Git hooks setup:"
echo "   bash setup-hooks.sh"
echo ""
echo "4. Restart Cursor to load configuration"
echo ""
echo "═══════════════════════════════════════════"
echo ""
echo "🧠 Multi-Agent System Ready!"
echo ""