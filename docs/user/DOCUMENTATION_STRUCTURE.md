# 📚 Documentation Structure Guide

**Purpose:** Define where different types of documents should be placed in the BrainBox project  
**Language:** English (documentation), Bulgarian (user-facing summaries)  
**Last Updated:** 2025-12-27

---

## 📁 Directory Structure

```
Chat Organizer/
├── docs/                          # ALL documentation (NO README files)
│   ├── agents/                    # Agent-related documentation
│   │   ├── agent_document.md      # Cross-agent coordination (MANDATORY)
│   │   ├── api_agent.md           # API agent personal docs
│   │   ├── db_agent.md            # Database agent personal docs
│   │   ├── extension_agent.md     # Extension agent personal docs
│   │   └── logs/                   # Agent log files
│   │       ├── api_agent.log
│   │       ├── db_agent.log
│   │       ├── extension_agent.log
│   │       ├── test_agent.log
│   │       └── ui_agent.log
│   │
│   ├── project/                    # Project documentation
│   │   ├── AUTH_FLOW_EXPLAINED.md  # Feature explanations
│   │   ├── EXTENSION_*.md          # Extension-related docs
│   │   ├── TODO.md                 # Project tasks
│   │   └── *.md                    # Other project docs
│   │
│   └── user/                       # User-facing documentation
│       ├── *_BG.md                 # Bulgarian summaries
│       └── DOCUMENTATION_STRUCTURE.md  # This file
│
├── .cursor/rules/                  # Agent rules and guidelines
│   ├── extension.md               # Extension agent rules
│   ├── database.md                # Database agent rules
│   └── typescript.md              # TypeScript rules
│
├── cursorrules.md                 # Core agent system config (ROOT)
│
└── README.md                       # Project overview (ROOT - exception)
```

---

## 📋 Document Placement Rules

### 1. **docs/agents/** - Agent Documentation

**Purpose:** All agent-related documentation and logs

#### **docs/agents/agent_document.md** (MANDATORY)
- **What:** Cross-agent coordination and synchronization
- **Who updates:** All agents when changes affect others
- **Format:** Structured entries with timestamps
- **Language:** English only
- **Path:** `docs/agents/agent_document.md`

#### **docs/agents/{agent}_agent.md** - Agent Personal Documentation
- **What:** Agent-specific notes, learnings, patterns
- **Files:**
  - `docs/agents/db_agent.md` - Database patterns, MCP commands
  - `docs/agents/api_agent.md` - API patterns, endpoints
  - `docs/agents/extension_agent.md` - Extension patterns, platform notes
- **Language:** English only
- **Purpose:** Personal reference for each agent

#### **docs/agents/logs/** - Agent Log Files
- **What:** Agent activity logs
- **Files:**
  - `docs/agents/logs/db_agent.log`
  - `docs/agents/logs/api_agent.log`
  - `docs/agents/logs/extension_agent.log`
  - `docs/agents/logs/ui_agent.log`
  - `docs/agents/logs/test_agent.log`
- **Format:** `[TIMESTAMP] [ACTION] [STATUS] [DETAILS]`
- **Language:** English only
- **Purpose:** Track agent actions and decisions

---

### 2. **docs/project/** - Project Documentation

**Purpose:** All project-related technical documentation

#### **docs/project/EXTENSION_*.md** - Extension Documentation
- **What:** Extension-related technical documents
- **Examples:**
  - `docs/project/EXTENSION_IMPLEMENTATION_REVIEW.md` - Technical analysis
  - `docs/project/EXTENSION_TEST_REPORT.md` - Test results
  - `docs/project/EXTENSION_TODO.md` - Extension-specific tasks
  - `docs/project/EXTENSION_STATUS.md` - Extension status
  - `docs/project/extension_technical_specification.md` - Technical specs
- **Language:** English (technical)

#### **docs/project/{FEATURE}_EXPLAINED.md** - Feature Explanations
- **What:** Detailed explanations of features/flows
- **Examples:**
  - `docs/project/AUTH_FLOW_EXPLAINED.md` - Authentication flow
- **Pattern:** `{FEATURE}_EXPLAINED.md` or `{FEATURE}_FLOW_EXPLAINED.md`
- **Language:** English (technical)

#### **docs/project/TODO.md** - Project Tasks
- **What:** Project-wide tasks and bugs
- **Language:** English
- **Note:** Feature-specific TODOs go in feature docs (e.g., `EXTENSION_TODO.md`)

#### **docs/project/*.md** - Other Project Docs
- **What:** Any other project-related documentation
- **Examples:**
  - `docs/project/DOM_OPTIMIZATION_RESEARCH.md`
- **Language:** English

---

### 3. **docs/user/** - User Documentation

**Purpose:** User-facing documentation and summaries

#### **docs/user/*_BG.md** - Bulgarian Summaries
- **What:** User-facing summaries in Bulgarian
- **Examples:**
  - `docs/user/РЕЗЮМЕ_ТЕСТВАНЕ_BG.md` - Test summary in Bulgarian
- **Language:** Bulgarian only
- **Purpose:** Executive summaries for Bulgarian-speaking stakeholders

#### **docs/user/DOCUMENTATION_STRUCTURE.md** - This File
- **What:** Documentation structure guide
- **Language:** English
- **Purpose:** Reference for document placement

---

### 4. **.cursor/rules/** - Agent Rules

**Purpose:** Rules and guidelines for specific agents or technologies

#### **Files:**
- `.cursor/rules/extension.md` - Extension agent rules
- `.cursor/rules/database.md` - Database agent rules
- `.cursor/rules/typescript.md` - TypeScript coding rules

#### **Rules:**
- One file per agent/technology domain
- Language: English only
- Format: Structured with code examples
- Purpose: Reference for agents when working in that domain

---

### 5. **Root Level** - Core Configuration

**Purpose:** High-level project configuration (exceptions to docs/ rule)

#### **Files:**
- `cursorrules.md` - Core agent system configuration (MUST stay in root)
- `README.md` - Project overview (exception - allowed in root)

#### **Rules:**
- Keep minimal and high-level
- Language: English
- Purpose: First point of entry for new developers

---

## 🎯 Decision Tree: Where to Put a Document?

```
Is it agent-related?
├─ YES → Is it a log file?
│         ├─ YES → docs/agents/logs/{agent}_agent.log
│         └─ NO → Is it agent_document.md?
│                  ├─ YES → docs/agents/agent_document.md
│                  └─ NO → docs/agents/{agent}_agent.md
└─ NO ↓

Is it project documentation?
├─ YES → docs/project/{filename}.md
└─ NO ↓

Is it user-facing?
├─ YES → Is it in Bulgarian?
│         ├─ YES → docs/user/{TOPIC}_BG.md
│         └─ NO → docs/user/{topic}.md
└─ NO ↓

Is it cursorrules.md or README.md?
├─ YES → Root level (exceptions)
└─ NO → docs/project/{topic}.md (default)
```

---

## 📝 Naming Conventions

### Agent Documents
- `docs/agents/{agent}_agent.md` (lowercase with underscore)
- `docs/agents/logs/{agent}_agent.log` (lowercase with underscore)

### Project Documents
- `docs/project/{FEATURE}_IMPLEMENTATION_REVIEW.md` (UPPERCASE for major docs)
- `docs/project/{FEATURE}_TEST_REPORT.md`
- `docs/project/{FEATURE}_TECHNICAL_SPECIFICATION.md`
- `docs/project/{FEATURE}_TODO.md`
- `docs/project/{FEATURE}_FLOW_EXPLAINED.md`

### User Documents
- `docs/user/{TOPIC}_BG.md` or `docs/user/РЕЗЮМЕ_{TOPIC}_BG.md` (Bulgarian)

---

## ✅ Checklist: Before Creating a Document

1. **Check existing docs** - Don't duplicate
2. **Choose location** - Use decision tree above
3. **Follow naming** - Use conventions
4. **Set language** - English for technical, Bulgarian for summaries
5. **All docs in docs/** - Except cursorrules.md and README.md in root

---

## 🔄 Document Maintenance

### When to Update
- After major feature changes
- After test runs
- When agent learns something new
- When cross-agent impact occurs

### When to Archive
- Documents older than 6 months with no updates
- Superseded by newer documents
- Move to `docs/project/archive/` (if needed)

---

## 📌 Examples

### ✅ Correct Placements

```
✅ docs/agents/agent_document.md
   → Cross-agent coordination

✅ docs/agents/logs/extension_agent.log
   → Extension agent log

✅ docs/agents/extension_agent.md
   → Extension agent personal notes

✅ docs/project/EXTENSION_IMPLEMENTATION_REVIEW.md
   → Extension technical analysis

✅ docs/project/AUTH_FLOW_EXPLAINED.md
   → Feature explanation

✅ docs/project/TODO.md
   → Project tasks

✅ docs/user/РЕЗЮМЕ_ТЕСТВАНЕ_BG.md
   → Bulgarian summary

✅ cursorrules.md (root)
   → Core configuration (exception)

✅ README.md (root)
   → Project overview (exception)
```

### ❌ Incorrect Placements

```
❌ docs/agent_document.md
   → Should be docs/agents/agent_document.md

❌ logs/extension_agent.log
   → Should be docs/agents/logs/extension_agent.log

❌ docs/EXTENSION_TEST_REPORT.md
   → Should be docs/project/EXTENSION_TEST_REPORT.md

❌ EXTENSION_STATUS.md (root)
   → Should be docs/project/EXTENSION_STATUS.md

❌ docs/РЕЗЮМЕ_ТЕСТВАНЕ_BG.md
   → Should be docs/user/РЕЗЮМЕ_ТЕСТВАНЕ_BG.md
```

---

## 🎓 Summary

**Key Principles:**
1. **ALL documents in docs/** (except cursorrules.md and README.md in root)
2. **docs/agents/** = Agent docs + logs
3. **docs/project/** = Project documentation
4. **docs/user/** = User-facing docs
5. **.cursor/rules/** = Agent rules/guidelines
6. **Root** = Only cursorrules.md and README.md

**Language Rules:**
- Technical docs: English
- User summaries: Bulgarian (optional)
- Code/logs: English only

**Naming:**
- UPPERCASE for major project docs
- lowercase_with_underscore for agent docs
- Descriptive, clear names

---

*Last updated: 2025-12-27*  
*Version: 2.0.0*
