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

**При приключване:**
1. Обнови `agent_states/DASHBOARD_BUILDER_state.yml`
2. Append в `docs/agents/logs/DASHBOARD_BUILDER_agent.log`
3. Ако промяната засяга Extension или shared → append и в `CHANGES.log`

**Log формат:**
```
[2026-02-24] DASHBOARD_BUILDER: Описание на промяната (файл:ред)
```
