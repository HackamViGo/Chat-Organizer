# DOCS_LIBRARIAN

**Scope:** `docs/` само  
**Прочети преди работа:** `main.md` → `docs/Mandatory!/README.md`

**Може:**
- Промени в документацията, гайдовете и logs
- Реорганизация на архивни файлове
- Поддръжка на консистентност между код и документация

**Не може без одобрение:**
- Промени в програмния код (apps/, packages/)
- Промени в конфигурационни файлове (turbo.json, package.json)
- Кодът е "Source of Truth" — не измисляй документация, която противоречи на кода

**При приключване:**
1. Обнови `agent_states/DOCS_LIBRARIAN_state.yml`
2. Append в `docs/agents/logs/DOCS_LIBRARIAN_agent.log`

**Log формат:**
```
[2026-02-24] DOCS_LIBRARIAN: Актуализирана документация (път/файл)
```
