# Extension Codebase Audit TODO

## 1. File Structure & Inventory
- [x] Generate comprehensive file tree for `apps/extension/src`.
- [x] Provide descriptions for each directory and key file.
    - [x] `src/background`
    - [x] `src/content`
    - [x] `src/popup`
    - [x] `src/lib`
    - [x] `src/options` (Verified: Absent/Nested)
    - [x] `src/components` (Verified: in `src/popup/components`)
    - [x] `src/hooks` (Verified: in `src/popup/hooks`)
    - [x] `src/types`
    - [x] `src/utils` (Verified: using `lib/`)
- [x] Non-src assets & config
    - [x] `public/` / `assets/` (Managed by Vite/CRX)
    - [x] `manifest.json`
    - [x] `package.json`
    - [x] `tsconfig.json`
    - [x] `vite.config.ts`
    - [x] `.eslintrc.js`
    - [x] `.prettierrc`
    - [x] `dist/` (Build artifact)
    - [x] `docs/`
    - [x] `README.md`
    - [x] `tailwind.config.js`
    - [x] `postcss.config.js`

## 2. Core Logic Documentation
- [x] **Authentication System**
- [x] **Synchronization Mechanism**
- [x] **Login & Session Flow**
- [x] **UI & Component Logic**
- [x] **Build & Configuration Workflow**

## 3. Function & Dependency Analysis
- [x] **Function Inventory (Background/Content)**
- [x] **Function Inventory (UI/Hooks/Utils)**
- [x] **Dependency Matrix (Core)**
- [x] **Dependency Matrix (UI/Styles)**

## 4. Final Output
- [x] Update `apps/extension/docs/audit/AUDIT_REPORT.md`.
