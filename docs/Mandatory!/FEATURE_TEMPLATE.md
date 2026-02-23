# FEATURE_TEMPLATE.md

> **Правило:** Агентът не пише нито ред код за нова функционалност без попълнен шаблон.  
> **Как се използва:** Копирай секцията "Шаблон", попълни я, commit-ни я в `docs/features/`, после пиши код.

---

## Защо съществува този шаблон

Аудитите показаха, че повечето архитектурни проблеми в BrainBox произхождат от функционалности, имплементирани без предварително обмисляне на edge cases, security и data flow. Шаблонът принуждава мислене преди писане.

---

## Шаблон

```markdown
# Feature: [Кратко описателно заглавие]

**Дата:** YYYY-MM-DD  
**Автор:** [Твоето име / AI агент]  
**Статус:** Draft | In Review | Approved | In Progress | Done  
**Свързани файлове:** (попълва се след имплементация)

---

## 1. Проблем

*Какъв конкретен проблем решава тази функционалност?  
Кой потребителски сценарий не работи сега?*

---

## 2. Решение (UX поведение)

*Стъпка по стъпка — какво вижда и прави потребителят.*

Пример:
1. Потребителят отваря чат и кликва "Generate Summary"
2. Бутонът показва loading state
3. След 2-5 секунди се появява summary под заглавието
4. Потребителят може да редактира summary inline
5. Промените се запазват автоматично след 1 секунда idle

---

## 3. Данни

### Нови полета / промени в schema

| Поле | Тип | Таблица | Nullable | Описание |
|------|-----|---------|----------|----------|
| `summary` | `text` | `chats` | да | AI-генерирано обобщение |

### Необходими миграции

```sql
-- Пример
ALTER TABLE chats ADD COLUMN summary text;
```

### Нови или променени Zod schemas

- Добави `summary: z.string().nullable().optional()` в `updateChatSchema`

### Нови или променени API endpoints

| Method | Path | Кой извиква | Описание |
|--------|------|-------------|----------|
| `POST` | `/api/ai/summary` | Dashboard client | Генерира summary за чат |

---

## 4. Архитектурно решение

*Кой слой прави какво — попълни само засегнатите слоеве:*

**Extension:** (ако е засегнат)

**Dashboard API route:**

**Dashboard Store:**

**Dashboard Component:**

**Shared packages (нови типове/schemas):**

---

## 5. Edge Cases

*Попълни поне 5. Непопълнени edge cases = rejected feature.*

| Сценарий | Очаквано поведение |
|----------|-------------------|
| Чатът е празен (0 съобщения) | Бутонът е disabled, tooltip "Add messages first" |
| AI API върне грешка | Toast "Summary failed", retry button, не губи предишния summary |
| Потребителят затвори таба по средата | Summary не се запазва (не е started) |
| Summary е по-дълъг от 2000 символа | Truncate на DB ниво, не silently |
| Два едновременни requests за един чат | Second request се debounce/cancel |
| User е на free plan | Бутонът е locked с upgrade prompt |

---

## 6. Security

*Попълни всяка точка — "N/A" не е валиден отговор без обяснение.*

| Проверка | Как е адресирана |
|----------|-----------------|
| Auth — само собственикът вижда данните | `user_id` проверка в API route + RLS policy |
| Input validation | `z.string().max(50000)` за messages преди AI call |
| Rate limiting | Max 5 AI requests/минута/потребител (Upstash) |
| Injection | Input минава през `dompurify` преди DB запис |
| Exposure на AI API key | Само в server-side API route, не в клиент |

---

## 7. Как ще се тества

| Тест | Тип | Файл |
|------|-----|------|
| Happy path: summary се генерира | Unit | `summary.test.ts` |
| Error path: AI API failure → rollback | Unit | `summary.test.ts` |
| Rate limiting работи | Integration | `api-rate-limit.test.ts` |
| RLS: user не вижда чужд summary | E2E | `rls.spec.ts` |
| UI: loading state при pending | Component | `ChatCard.test.tsx` |

---

## 8. Definition of Done

- [ ] Шаблонът е commit-нат в `docs/features/`
- [ ] DB миграцията е написана и тествана
- [ ] `pnpm db:gen` е изпълнен
- [ ] Zod schema е актуализирана
- [ ] API route има auth + validation
- [ ] Store action има optimistic update + rollback
- [ ] Всички edge cases от секция 5 са имплементирани
- [ ] Тестовете от секция 7 са написани и минават
- [ ] `pnpm verify` минава с score > 80
- [ ] Feature branch е merge-нат чрез PR (не директен push)
```

---

## Пример за попълнен шаблон

Виж `docs/features/ai-summary.md` като reference.

---

## Правило за AI агенти

Ако потребителят поиска нова функционалност без попълнен шаблон:

1. Не пиши код
2. Генерирай попълнен шаблон за функционалността въз основа на искането
3. Постави на потребителя 3 въпроса за неизяснените части (edge cases, security)
4. Чакай потребителят да потвърди шаблона
5. Едва тогава пиши код
