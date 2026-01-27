/* docs/agents/AI_Best_practice.md (placeholder filled with best-practices summary) */
# AI Best Practices (BrainBox Project)

- Follow MV3 extension architecture with background service worker.
- Centralize messaging in background main.ts and route to API/auth layers.
- Use chrome.storage.local for reactive state and chrome.tabs for tab events.
- UI is standalone popup; avoid DOM injection on host pages.
- Model buttons colored per model with direct URLs to model pages.
- Avoid downloads; route chats to ChatCard directly.
- Implement dev/production switches and a single-word toggle for auth.
- Reuse existing site CSS when possible to maintain visual consistency.
- Provide connectivity matrix and extension dependency map in docs.

Links:
- Chrome MV3 Manifest: https://developer.chrome.com/docs/extensions/mv3/manifest/
- MV3 Background: https://developer.chrome.com/docs/extensions/mv3/background_pages/
- Storage API: https://developer.chrome.com/docs/extensions/reference/storage/

Note: This is a summary; adapt as project evolves.
