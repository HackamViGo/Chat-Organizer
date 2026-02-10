# Проучване на последните стабилни версии на пакети

**Дата на генериране:** 2026-02-10 00:08:32

## Core Infrastructure

### Turbo (Turborepo)
- **Версия:** 2.x
- **Линк:** https://turbo.build
- **Бележки при ъпдейт:**
  - Преходът 1.x → 2.0 изисква `@turbo/codemod` миграция
  - Обновяване на `turbo.json` и `packageManager` в `package.json`
  - По-строго поведение на env променливи
  - Промени в `turbo run` (може да счупи стари пайплайни)

### pnpm
- **Версия:** 10.17.0
- **Линк:** https://pnpm.io
- **Бележки при ъпдейт:**
  - pnpm 10 изисква съвременен Node
  - Препоръчва се синхронизация през Corepack/proto
  - При ъпгрейд от <9 провери lock файла
  - Някои флагове на CLI са променени

### TypeScript
- **Версия:** 5.9.2
- **Линк:** https://www.typescriptlang.org
- **Бележки при ъпдейт:**
  - При ъпгрейд от 4.x → 5.x очаквай по-строги типове
  - Промени в `lib.dom.d.ts`
  - Next.js 16 изисква TypeScript ≥ 5.1

### Node.js (Runtime)
- **Версия:** 22.22.0 (LTS "Jod"), 20.20.0 (LTS "Iron")
- **Линк:** https://nodejs.org
- **Бележки при ъпдейт:**
  - Новите инструменти очакват **Node ≥ 20**
  - За продъкшън се придържай към LTS 22.x
  - При ъпгрейд провери native addons и стари node APIs

---

## Frontend & UI

### Next.js
- **Версия:** 16.x
- **Линк:** https://nextjs.org
- **Бележки при ъпдейт:**
  - Изисква **Node ≥ 20.9.0** и **TypeScript ≥ 5.1.0**
  - Променени кеширащи семантики (`fetch` и `GET` route handlers са uncached по подразбиране)
  - Async APIs за `cookies()/headers()`
  - Използвай `@next/codemod` за автоматична миграция

### React
- **Версия:** 19.2.1
- **Линк:** https://react.dev
- **Бележки при ъпдейт:**
  - При ъпгрейд от 18 към 19 провери peerDependencies
  - Увери се, че build toolchain (Next/Vite) е тестван с React 19

### react-dom
- **Версия:** 19.2.1
- **Линк:** https://www.npmjs.com/package/react-dom
- **Бележки при ъпдейт:**
  - Версиите на `react` и `react-dom` **трябва да съвпадат**
  - Увери се, че `@types/react(-dom)` са от същия major

### Tailwind CSS
- **Версия:** 4.1.13
- **Линк:** https://tailwindcss.com
- **Бележки при ъпдейт:**
  - V4 има изцяло нов high-performance engine
  - Променена конфигурация - използва `@tailwindcss/postcss` с PostCSS
  - Таргетира само модерни браузъри (Safari ≥16.4, Chrome ≥111)
  - За legacy поддръжка остани на 3.x

### PostCSS
- **Версия:** 8.5.6
- **Линк:** https://postcss.org
- **Бележки при ъпдейт:**
  - Внимавай да няма стари PostCSS 7 плъгини
  - Проверка на webpack конфигурации

### Autoprefixer
- **Версия:** 10.4.21
- **Линк:** https://github.com/postcss/autoprefixer
- **Бележки при ъпдейт:**
  - При ъпгрейд може да се промени генерирания CSS (по-малко legacy префикси)
  - Увери се, че browserslist конфигурацията е актуална

### Framer Motion
- **Версия:** 12.23.24
- **Линк:** https://github.com/motiondivision/motion
- **Бележки при ъпдейт:**
  - Екипът препоръчва миграция към новия пакет `motion` (`motion/react`)
  - Внимавай при ъпгрейд от 10/11 за промени в velocity и render scheduling

### Lucide React
- **Версия:** 0.544.0
- **Линк:** https://lucide.dev/guide/packages/lucide-react
- **Бележки при ъпдейт:**
  - При ъпгрейд към React 19 ползвай последните 0.54x+ версии
  - Провери `peerDependencies` за съвместимост

### clsx
- **Версия:** 2.1.1
- **Линк:** https://github.com/lukeed/clsx
- **Бележки при ъпдейт:**
  - 2.1.1 добавя подмодула `clsx/lite`
  - `clsx/lite` игнорира всички не-string аргументи
  - Не е drop-in замяна - прегледай местата с обекти/масиви

### tailwind-merge
- **Версия:** 3.3.1
- **Линк:** https://github.com/dcastil/tailwind-merge
- **Бележки при ъпдейт:**
  - 3.x поддържа Tailwind 4.0–4.1
  - За Tailwind 3 остани на 2.6.0
  - При ъпгрейд провери custom конфигурации

---

## Extension Build Tooling

### Vite
- **Версия:** 7.1.5
- **Линк:** https://vite.dev
- **Бележки при ъпдейт:**
  - Vite 7 изисква **Node ≥ 20.19+**
  - При ъпгрейд от 4/5/6 прегледай Vite plugin-ите
  - Провери конфигурацията за SSR

### @crxjs/vite-plugin
- **Версия:** 2.3.0
- **Линк:** https://github.com/crxjs/chrome-extension-tools
- **Бележки при ъпдейт:**
  - Проектът е жив, но с намалено активно развитие
  - При Vite 6/7 ще получиш peer warnings - но работи
  - Тествай HMR и manifest v3/Firefox поведение

### vite-tsconfig-paths
- **Версия:** 5.1.4
- **Линк:** https://github.com/aleclarson/vite-tsconfig-paths
- **Бележки при ъпдейт:**
  - **Не поддържа CSS импорти** за path aliases
  - За non-TS модули трябва `allowJs: true` или `loose: true`

### @types/chrome
- **Версия:** 0.1.36
- **Линк:** https://www.npmjs.com/package/@types/chrome
- **Бележки при ъпдейт:**
  - Официалните DefinitelyTyped типове за Chrome Extensions
  - Провери дали не ползваш вече новия пакет `chrome-types` от Google
  - Не ги смесвай в един и същ проект

---

## Data & Backend Integration

### Zod
- **Версия:** 4.1.9
- **Линк:** https://zod.dev
- **Бележки при ъпдейт:**
  - Zod 4 въвежда subpath versioning
  - При ъпгрейд от 3.x провери дали зависимите библиотеки са актуализирани
  - Може да имаш два различни `instanceof` графа

### @supabase/supabase-js
- **Версия:** 2.95.3
- **Линк:** https://supabase.com/docs/reference/javascript/v1
- **Бележки при ъпдейт:**
  - 2.x линията има нов Auth API
  - По-силна типизация чрез генерирани DB типове
  - Миграция от `auth.signIn()` към новите методи

### @supabase/ssr
- **Версия:** 0.8.0
- **Линк:** https://github.com/supabase/ssr
- **Бележки при ъпдейт:**
  - Замества всички стари `@supabase/auth-helpers-*` пакети
  - Все още е 0.x - API може да се променя
  - Синхронизирай версията с `@supabase/supabase-js`

### @google/generative-ai
- **Версия:** 0.24.1
- **Линк:** https://www.npmjs.com/package/@google/generative-ai
- **Бележки при ъпдейт:**
  - Google промотира **`@google/genai` 1.x** като по-нов SDK
  - За нови проекти ползвай `@google/genai`
  - Внимавай за breaking промени в имената на моделите

### @upstash/redis
- **Версия:** 1.36.2
- **Линк:** https://github.com/upstash/redis-js
- **Бележки при ъпдейт:**
  - HTTP-базиран Redis клиент за serverless/edge
  - Новите версии добавят JSON, search команди
  - Latency профилът е HTTP, не TCP

---

## Testing & Quality

### Vitest
- **Версия:** 3.2.4
- **Линк:** https://vitest.dev
- **Бележки при ъпдейт:**
  - Vitest 3 е първата линия с официална поддръжка на Vite 6+
  - Изисква **Node ≥ 20** и Vite ≥ 6
  - При ъпгрейд от 1.x/2.x прегледай custom reporters

### Playwright
- **Версия:** 1.55.0
- **Линк:** https://playwright.dev
- **Бележки при ъпдейт:**
  - След ъпдейт: `npx playwright install --with-deps`
  - Поддържа Node 20
  - Увери се, че `@playwright/test` версията съвпада с основния пакет

### @testing-library/react
- **Версия:** 16.3.0
- **Линк:** https://testing-library.com/docs/react-testing-library/intro
- **Бележки при ъпдейт:**
  - От v16 изисква `@testing-library/dom` като peerDependency
  - Изисква React ≥18
  - За по-стар React остани на v12

### ESLint
- **Версия:** 9.35.0
- **Линк:** https://eslint.org
- **Бележки при ъпдейт:**
  - Поддържа Node `^18.18.0 || ^20.9.0 || >=21.1.0`
  - Breaking change: **flat config** (`eslint.config.mjs`)
  - Миграция от `.eslintrc*` формати

### Prettier
- **Версия:** 3.8.1
- **Линк:** https://prettier.io
- **Бележки при ъпдейт:**
  - 3.x е major с промени в форматирането
  - При ъпгрейд очаквай масивен diff
  - Единичен "format all" commit и синхронизация между CLI/редактори/CI

---

## Обобщени препоръки за ъпдейт стратегия

### 1. Подравни Node и package manager-ите първо
- Минимум **Node 20** за целия стек; препоръчително 22 LTS
- Закотви версии на pnpm (`"packageManager": "pnpm@10.x"`)
- Избегни "works on my machine" проблеми

### 2. Ъпгрейд по слоеве
1. **Core** (Node, pnpm, TypeScript, Turbo)
2. **Build tooling** (Vite, Vitest, ESLint, Prettier)
3. **Framework** (Next, React, Tailwind)
4. **Библиотеки** (Zod, Supabase, UI/икони/анимации)

След всяка стъпка пускай минимален smoke-test (build + unit tests + E2E).

### 3. Внимавай за peerDependencies
- **React 19** → провери `lucide-react`, `@testing-library/react`, `framer-motion`, Next версията
- **Tailwind 4** → потвърди версии на `tailwind-merge`, PostCSS, Autoprefix


---

**Генерирано на:** 2026-02-10 00:08:32
**Източник:** Проучване на официални източници (npm, GitHub, документация)
