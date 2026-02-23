# Extension Codebase Audit TODO

## 1. File Structure & Inventory
- [ ] Generate comprehensive file tree for `apps/extension/src`.
- [ ] Provide descriptions for each directory and key file.
    - [ ] `src/background`
    - [ ] `src/content`
    - [ ] `src/popup`
    - [ ] `src/lib`

## 2. Core Logic Documentation
- [ ] **Authentication System**
    - [ ] Explain Dashboard token management (`accessToken`, `refreshToken`).
    - [ ] Explain Platform token capture (ChatGPT, Claude, Gemini).
    - [ ] Detail `AuthManager` responsibility.
- [ ] **Synchronization Mechanism**
    - [ ] Explain `syncAll` logic in Service Worker.
    - [ ] Detail `PromptSyncManager` operations.
    - [ ] Document triggers (Startup, Button Click, Periodic).
- [ ] **Login & Session Flow**
    - [ ] Map the flow: Dashboard Login -> Redirect -> Token Capture -> Storage.
    - [ ] Explain Session Validation (`isSessionValid`).

## 3. Function & Dependency Analysis
- [ ] **Function Inventory**
    - [ ] List public/private methods in `AuthManager`.
    - [ ] List methods in `DashboardAPI`.
    - [ ] List handlers in Content Scripts.
- [ ] **Dependency Matrix**
    - [ ] Map internal dependencies (e.g., Service Worker -> AuthManager).
    - [ ] Identify shared package usage.

## 4. Final Output
- [ ] Compile all findings into `apps/extension/docs/audit/AUDIT_REPORT.md`.
