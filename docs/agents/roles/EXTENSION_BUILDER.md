# EXTENSION_BUILDER

**Scope:** `apps/extension/` само  
**Прочети преди работа:** `main.md` → `docs/EXTENSION.md` → `docs/technical/SYNC_PROTOCOL.md`

**Може:**
- Промени в content scripts, адаптери, service worker
- Промени в `manifest.json`
- Промени в `vite.config.ts`

**Не може без одобрение:**
- Промени в `packages/` (shared типове)
- Промени в Dashboard API routes
- Добавяне на нови npm пакети

**При приключване:**
1. Обнови `agent_states/EXTENSION_BUILDER_state.yml`
2. Append в `docs/agents/logs/EXTENSION_BUILDER_agent.log`
3. Ако промяната засяга Dashboard или shared → append и в `CHANGES.log`

**Log формат:**
```
[2026-02-24] EXTENSION_BUILDER: Описание на промяната (файл:ред)
```
