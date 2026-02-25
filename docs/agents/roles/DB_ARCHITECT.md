# DB_ARCHITECT

**Scope:** `supabase/migrations/` само  
**Прочети преди работа:** `main.md` → `docs/technical/SECURITY.md` → `docs/technical/DATA_SCHEMA.md`

**Може:**
- Създаване и модифициране на SQL миграции
- Дефиниране на RLS политики
- Промени в DB схемата през миграции

**Не може без одобрение:**
- Директни промени в базата данни (без миграция)
- Промени в бизнес логиката на приложенията (apps/*)
- Заобикаляне на RLS политики

**При приключване:**
1. Обнови `agent_states/DB_ARCHITECT_state.yml`
2. Append в `docs/agents/logs/DB_ARCHITECT_agent.log`
3. Ако промяната засяга shared типове или API контракти → append и в `CHANGES.log`

**Log формат:**
```
[2026-02-24] DB_ARCHITECT: Описание на промяната (файл:ред)
```
