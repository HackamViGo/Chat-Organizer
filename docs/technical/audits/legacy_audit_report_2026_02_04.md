
# 🔍 PROJECT AUDIT REPORT
Generated: 2026-02-04 05:18:52

## 📊 Project Overview

**Location**: /home/stefanov/Projects/Chat Organizer Cursor

### Metrics:
- Total Files: 587
- Code Files: 295
- Total Lines of Code: 61,663

### Technologies Detected:
- Node.js
- Python
- React

### Frameworks:
- Next.js
- React

## 📁 File Distribution

- **.ts**: 155 files
- **.tsx**: 80 files
- **.json**: 75 files
- **.js**: 58 files
- **.md**: 51 files
- **.png**: 51 files
- **.zst**: 47 files
- **.log**: 10 files
- **.sh**: 8 files
- **.pdf**: 8 files


## 🏥 Health Score: 60/100

- 🔒 **Security**: 0/100 🔴
- ⚡ **Performance**: 100/100 🟢
- 📝 **Code Quality**: 0/100 🔴
- 📚 **Documentation**: 100/100 🟢

## ⚠️ Issues Found: 158


### HIGH Priority (86 issues)

- **extension/background/service-worker.js**: Possible hardcoded token
- **extension/content/brainbox_master.js**: Possible hardcoded token
- **extension/content/content-claude.js**: Possible hardcoded token
- **extension/content/inject-gemini-main.js**: Possible hardcoded token
- **extension/content/content-dashboard-auth.js**: Possible hardcoded token
  *(... and 81 more)*

### MEDIUM Priority (11 issues)

- **scripts/verification.py**: 1 TODO/FIXME comments found
- **meta_architect/scripts/project_auditor.py**: 8 TODO/FIXME comments found
- **apps/extension/src/background/modules/authManager.ts**: 1 TODO/FIXME comments found
- **src/app/download/page.tsx**: 1 TODO/FIXME comments found
- **src/components/features/folders/FolderHeader.tsx**: 1 TODO/FIXME comments found
  *(... and 6 more)*

### LOW Priority (61 issues)

- **scripts/verify_extension.js**: console.log statements found (should be removed in production)
- **scripts/validate-commit.js**: console.log statements found (should be removed in production)
- **scripts/debug_live.js**: console.log statements found (should be removed in production)
- **extension/background/service-worker.js**: console.log statements found (should be removed in production)
- **extension/content/content-chatgpt.js**: console.log statements found (should be removed in production)
  *(... and 56 more)*


## ❌ Missing Components

- Python dependencies (requirements.txt)
- Docker orchestration (docker-compose.yml)
- Container definition (Dockerfile)
- Linting configuration (.eslintrc)
- Python test configuration (pytest.ini)
- Jest test configuration (jest.config.js)

---
*Audit completed successfully*
