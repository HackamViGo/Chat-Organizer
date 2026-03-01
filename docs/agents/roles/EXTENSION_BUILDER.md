# EXTENSION_BUILDER

**Scope:** `apps/extension/` само  
**Прочети преди работа:** `main.md` → `docs/Mandatory!/EXTENSION.md` → `docs/technical/SYNC_PROTOCOL.md`

**Може:**
- Промени в content scripts, адаптери, service worker
- Промени в `manifest.json`
- Промени в `vite.config.ts`

**Не може без одобрение:**
- Промени в `packages/` (shared типове)
- Промени в Dashboard API routes
- Добавяне на нови npm пакети

**При приключване (Rule #10 Exit Protocol):**
1. Обнови `agent_states/EXTENSION_BUILDER_state.yml`
2. Добави детайлен блок в `docs/agents/logs/EXTENSION_BUILDER_agent.log`
3. Append в `docs/agents/logs/CHANGES.log` за изисквания към другите агенти.
4. Докладвай на потребителя на български.
5. Обнови .agent/rules/knowledge_graph.json
6. Обнови .agent/rules/ProjectGraph.json

**Log формат:**
```
[2026-02-24] EXTENSION_BUILDER: Описание на промяната (файл:ред)
```
