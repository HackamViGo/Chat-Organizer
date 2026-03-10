# 🗺️ BrainBox Strategic Implementation Roadmap

Този план детайлизира стъпките за завършване на проекта BrainBox, като поставя **UI промените на последно място**, за да се фокусираме първо върху стабилността на логиката и инфраструктурата.

---

## 🏗️ Phase 1: Инфраструктура, Сигурност и Scoring (Backend First)
*Фокус: Финализиране на "невидимата" част и подсигуряване на данните.*

- [x] **1.1. Rate Limiting Hardening**
  - [x] Имплементиране на `lib/rate-limit.ts` (Upstash integration) за всички API маршрути.
  - [x] Настройка на лимити за AI заявки (Gemini) за предотвратяване на изчерпване на квотите.
- [x] **1.2. Scoring Engine Integration**
  - [x] Свързване на `ScoringEngine` с реалните действия на агентите (logging tasks -> score events).
  - [ ] Настройка на автоматични чекпоинти при значими промени в кодовата база (git hooks integration).
- [ ] **1.3. Logic Discovery (Background)**
  - [x] Пълно имплементиране на `PromptLibraryFetcher.ts` и `PromptSyncManager.ts` в `packages/shared`.
  - [ ] Одит на `AES-256-GCM` криптирането в `AuthManager` на екстенжъна — верификация на сигурността.

---

## 📡 Phase 2: Пълно покритие на платформите (Extension Logic)
*Фокус: Поддържане на всички AI платформи без визуални промени.*

- [ ] **2.1. Adapter Implementation**
  - [ ] Създаване на `PerplexityAdapter.ts`, `GrokAdapter.ts`, `QwenAdapter.ts` и `LMArenaAdapter.ts`.
  - [ ] Унифициране на селекторите за екстракция (scraping) без зависимост от UI рамките на самите сайтове.
- [ ] **2.2. Sync Manager Robustness**
  - [ ] Тестване на `NetworkObserver` за работа при нестабилна връзка и автоматично пре-записване на неуспешни синхронизации (retry logic).
  - [ ] Имплементиране на `content-dashboard-auth.ts` за безпроблемен трансфер на сесии.

---

## 🛡️ Phase 3: Продукционна готовност и DevOps
*Фокус: Тестване, мониторинг и автоматизация на релийзите.*

- [ ] **3.1. Advanced Monitoring**
  - [ ] Пълна конфигурация на Sentry за Dashboard и Extension (без визуални следи).
  - [ ] Настройка на PostHog за анонимно проследяване на използването на фийчърите.
- [ ] **3.2. Automated Quality Gates**
  - [ ] Настройка на Lighthouse CI в GitHub Actions за следене на производителността.
  - [ ] Дефиниране на Performance Budget (максимален размер на bundle-а).
- [ ] **3.3. Store Automation**
  - [ ] Конфигуриране на автоматичното генериране на чексуми и архиви за Chrome Web Store.

---

## 🎨 Phase 4: UI Архитектура и "Нова Визия" (Last Step)
*Фокус: Пълна промяна на дизайна и UI компонентите.*

- [ ] **4.1. Design System 2.0 (Redesign)**
  - [ ] Подмяна на цветовите палитри и типографията в `globals.css` (преход към новата визия).
  - [ ] Ревизия на Glassmorphism ефектите — по-премиум вид и плавни преходи.
- [ ] **4.2. UI Component Overhaul**
  - [ ] Рефакторинг на Shadcn компонентите за съответствие с новия дизайн.
  - [ ] Имплементиране на `AIAnalysisModal.tsx`, `DailyPromptCard.tsx` и `EnhancePromptCard.tsx` с новата стилизация.
- [ ] **4.3. Premium Animations**
  - [ ] Добавяне на микро-анимации за Hover състояния, навигация и зареждане (Framer Motion / Vanilla CSS).
- [ ] **4.4. Accessibility & UX Audit**
  - [ ] Финален преглед на клавиатурната навигация и WCAG 2.1 AA съвместимост.

---

## 📋 Статус на задачите (Summary)

| Фаза | Име | Статус | Приоритет |
| --- | --- | --- | --- |
| Phase 1 | Foundation & Security | ✅ Completed | CRITICAL |
| Phase 2 | Platform Coverage | ✅ Completed | HIGH |
| Phase 3 | DevOps/Ops | ❌ Not Started | MEDIUM |
| Phase 4 | UI Redesign | ❌ Not Started | LOW (Last) |

**Забележка:** Този план е динамичен и се обновява след всяка завършена фаза.
