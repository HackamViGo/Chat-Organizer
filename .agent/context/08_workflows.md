# 08 — Workflows

Workflows живеят в `.agent/workflows/`.
Пълните им пътища са в `.agent/rules/INDEX.json` → `"workflows"`.

## Project Workflows

| Workflow | Кога |
|----------|------|
| `/run-guardians` | Преди всеки commit |
| `/guardian-by-role` | Guardians само за текущата роля |
| `/bump-version` | При нова версия |
| `/new-api-endpoint` | При нов API route в apps/dashboard |
| `/sync-env` | След нов .env ключ |
| `/check-deps` | При dependency drift |
| `/janitor` | При stray .md или lock files |
| `/test-connections` | Проверка на localhost портове |
| `/graph-search` | Търсене в графовете |
| `/graph-add` | Нов node в граф |

## Scoring Workflows

| Workflow | Кога |
|----------|------|
| `/checkpoint` | Преди рискова операция |
| `/rollback` | При каша — връща до checkpoint |
| `/score` | Преглед на точки и events |
| `/report-task` | След завършена задача |

## Extension V3 Workflows

| Workflow | Кога |
|----------|------|
| `/config-consolidation` | ПЪРВО — fixes за счупения popup |
| `/phase1-gemini-save` | Gemini save (DOM + MAIN world bridge) |
| `/phase2-all-platforms` | ChatGPT, Claude, Grok, Perplexity + offline queue |
| `/phase3-prompt-actions` | Tags, AI enhance, selection capture, inject |
| `/phase4-deepseek-qwen-lmarena` | DeepSeek, Qwen, LM Arena + attachments + SWR |
| `/optimizations-sprint1-2` | P0+P1 оптимизации |
| `/test-extension` | Пуска Chrome с Ivan профил + extension |

## Правилен ред за Extension V3
```
/config-consolidation
  → Ctrl+Shift+B "Config: Verify ALL"
  → /phase1-gemini-save
  → Ctrl+Shift+B "Phase 1: Verify ALL"
  → /phase2-all-platforms
  → Ctrl+Shift+B "Phase 2: Verify ALL"
  → /phase3-prompt-actions
  → Ctrl+Shift+B "Phase 3: Verify ALL"
  → /phase4-deepseek-qwen-lmarena
  → Ctrl+Shift+B "Phase 4: Verify ALL"
  → /optimizations-sprint1-2
```
