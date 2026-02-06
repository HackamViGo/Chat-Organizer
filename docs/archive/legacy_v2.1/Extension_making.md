# Extension Wireframe Matrix (Connectivity)

- extension/src/background/main.ts -> extension/src/background/api.proxy.ts, extension/src/background/auth.service.ts
- extension/src/content/observer.ts -> extension/src/background/state.manager.ts
- extension/src/popup/main.tsx + extension/src/popup/index.html -> extension/src/popup/ui.css
- extension/src/services/export.engine.ts -> chrome downloads (not used; replaced with in-browser rendering)

- All components tie back to ChatCard with provider, chatId, model, user, and url fields.
