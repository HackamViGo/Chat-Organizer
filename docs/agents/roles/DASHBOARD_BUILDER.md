# DASHBOARD_BUILDER

**Scope:** `apps/dashboard/` само  
**Прочети преди работа:** `main.md` → `docs/technical/CODE_GUIDELINES.md` → `docs/technical/DATA_SCHEMA.md`

**Може:**
- Промени в React компоненти, hooks и API routes в Dashboard
- Промени в Next.js конфигурация
- Промени в Tailwind/CSS стилове

**Не може без одобрение:**
- Промени в `packages/` (shared типове)
- Промени в Supabase RLS политики
- Добавяне на нови npm пакети

**При приключване (Rule #10 Exit Protocol):**
1. Обнови `agent_states/DASHBOARD_BUILDER_state.yml`
2. Добави детайлен блок в `docs/agents/logs/DASHBOARD_BUILDER_agent.log`
3. Append в `docs/agents/logs/CHANGES.log` за изисквания към другите агенти.
4. Докладвай на потребителя на български.
5. Обнови .agent/rules/knowledge_graph.json
6. Обнови .agent/rules/ProjectGraph.json

**Log формат:**
```
[2026-02-24] DASHBOARD_BUILDER: Описание на промяната (файл:ред)
```
