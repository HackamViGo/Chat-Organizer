<!-- doc: STATUS.md | version: 1.0 | last-updated: 2026-02-28 -->
# 📊 STATUS.md — Project Health Snapshot

> **Обновен:** 2026-02-28 | **Роля:** DOCS_LIBRARIAN

---

## ✅ Build Status

| Workspace | Status | Команда |
|-----------|--------|---------|
| Dashboard (Next.js) | ✅ Работи | `pnpm dev` |
| Extension (Vite + CRXJS) | ✅ Работи | `pnpm dev:ext` |
| packages/shared | ✅ Компилиран | — |
| packages/validation | ✅ Компилиран | — |

## 📋 Known Issues

| 1 | Coverage thresholds не са enforced в `vitest.config.ts` | CI | MEDIUM |
| 2 | `normalizers.ts` е `deprecated` — няма план за изтриване документиран | Extension | LOW |

## 🎯 Next Milestones

- [ ] Добавяне на `coverage.thresholds` в `vitest.config.ts`
- [ ] Cleanup: изтриване на `apps/extension/src/lib/normalizers.ts`
- [ ] Създаване на `STATUS.md` автоматизиран workflow (агент обновява при всеки значим commit)

## 📎 Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [TESTING.md](./TESTING.md)
- [DOC_INVENTORY.md](./DOC_INVENTORY.md)
