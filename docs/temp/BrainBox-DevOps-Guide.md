**🧠 BrainBox**

**DevOps & Deployment Setup Guide**

Git Cleanup → Branch Strategy → Vercel → CI/CD → Agent Protocols

**0. Целевата архитектура**

Целта е прост, повторяем процес --- без изненади, без импровизации от
агентите:

---

LOCAL DEV (Docker container)

│

│ git push origin feature/xxx

▼

GitHub (feature branch)

│

│ PR → dev (Quality Gate CI задължителен ✅)

▼

dev branch ──► Vercel Preview ──► Твоето тестване

│

│ PR → main (Quality Gate CI задължителен ✅)

▼

main branch ──► Vercel Production ──► Потребители

---

+-----------------------------------------------------------------------+
| **⚠️ Желязно правило** |
| |
| Никой (агент или човек) не може да push-не директно в main или dev. |
| |
| Всичко минава през PR + Quality Gate. Без изключения. |
+-----------------------------------------------------------------------+

**1. Git Cleanup --- Изчистване на бранчовете**

Преди да настроим нещо, изчистваме хаоса. Запазваме само main и
feature/local-supabase (ще стане dev).

+-----------------------------------------------------------------------+
| **📋 Какво правим** |
| |
| 1\. Запазваме: main (production-ready код) |
| |
| 2\. Запазваме: feature/local-supabase → преименуваме го на dev |
| |
| 3\. Изтриваме: всички останали бранчове (локално + remote) |
| |
| 4\. Поставяме branch protection rules |
+-----------------------------------------------------------------------+

**1.1 Стъпки за изчистване**

+---+------------------------------------------------------------------+
| _ | **Провери какво имаш** |
| _ | |
| 1 | git branch -a → виж всички локални и remote бранчове |
| _ | |
| _ | |
+---+------------------------------------------------------------------+
| _ | **Вземи пълен snapshot** |
| _ | |
| 2 | git fetch \--all → синхронизирай с GitHub |
| _ | |
| _ | |
+---+------------------------------------------------------------------+
| _ | **Архивирай преди изтриване (safety)** |
| _ | |
| 3 | За всеки бранч, в който може да има нещо важно: git show |
| _ | branch-name:important-file \> backup.txt |
| _ | |
+---+------------------------------------------------------------------+
| _ | **Преименувай feature/local-supabase на dev** |
| _ | |
| 4 | git checkout feature/local-supabase && git branch -m dev && git |
| _ | push origin dev && git push origin \--delete |
| _ | feature/local-supabase |
+---+------------------------------------------------------------------+
| _ | **Изтрий останалите бранчове** |
| _ | |
| 5 | За всеки излишен бранч: git push origin \--delete branch-name |
| _ | (remote) && git branch -d branch-name (local) |
| _ | |
+---+------------------------------------------------------------------+
| _ | **Провери финалното състояние** |
| _ | |
| 6 | git branch -a → трябва да виждаш само main и dev |
| _ | |
| _ | |
+---+------------------------------------------------------------------+

**1.2 Промпт за агент --- Git Cleanup**

+-----------------------------------------------------------------------+
| **🤖 ПРОМПТ 1 / Git Cleanup Agent** |
+-----------------------------------------------------------------------+
| You are performing a ONE-TIME git cleanup for BrainBox monorepo. |
| |
| GOAL: Keep only 2 branches: main and dev |
| |
| dev = renamed from feature/local-supabase |
| |
| STEPS (execute in order, no skipping): |
| |
| 1\. Run: git fetch \--all |
| |
| 2\. Run: git branch -a → list ALL branches, show me the output |
| |
| 3\. WAIT for my confirmation before deleting anything |
| |
| 4\. After confirmation: |
| |
| a\) git checkout feature/local-supabase |
| |
| b\) git branch -m dev |
| |
| c\) git push -u origin dev |
| |
| d\) git push origin \--delete feature/local-supabase |
| |
| 5\. For each other branch (not main, not dev): |
| |
| a\) FIRST show: git log \--oneline -5 \<branch\> |
| |
| b\) WAIT for my OK, then delete |
| |
| 6\. Final check: git branch -a → show output |
| |
| FORBIDDEN: |
| |
| \- Do NOT delete main |
| |
| \- Do NOT delete dev |
| |
| \- Do NOT force-push anything |
| |
| \- Do NOT proceed past step 3 without my confirmation |
| |
| Output: Confirmation that only main and dev exist. |
+-----------------------------------------------------------------------+

**2. GitHub Branch Protection Rules**

Това е \'стената\' --- никой агент не може да push-не директно в main
или dev. Всичко минава само през PR.

**2.1 Правила за main (Production)**

---

**Правило** **Настройка**

Require pull request ✅ Включено --- без директен push

Required approvals 1 approval (ти трябва да approve-нваш)

Dismiss stale reviews ✅ Включено

Require status checks ✅ Включено --- quality-gate трябва да мине

Require branches up to ✅ Включено
date

Restrict who can push Само ти (owner)

Allow force pushes ❌ Забранено

Allow deletions ❌ Забранено

---

**2.2 Правила за dev (Staging)**

dev е по-relaxed --- агентите пушват feature бранчове и правят PR към
dev. Но CI все пак трябва да мине.

---

**Правило** **Настройка**

Require pull request ✅ Включено

Required approvals 0 approvals (агентите могат сами)

Require status checks ✅ Включено --- quality-gate задължителен

Allow force pushes ❌ Забранено

Allow deletions ❌ Забранено

---

**3. CI/CD --- GitHub Actions**

Два workflow файла: Quality Gate (проверява всичко) и Deploy (само
нотификация --- Vercel деплоя сам).

**3.1 Quality Gate --- задължителен за ВСЕКИ PR**

+-----------------------------------------------------------------------+
| **Кога се изпълнява** |
| |
| • Push към feature/\*\*, fix/\*\*, chore/\*\* бранчове |
| |
| • PR към dev (от feature бранч) |
| |
| • PR към main (от dev бранч) |
| |
| • Push директно към dev (за safety) |
+-----------------------------------------------------------------------+

**Файл: .github/workflows/quality-gate.yml**

---

name: 🔍 Quality Gate

on:

push:

branches:

\- dev

\- \'feature/\*\*\'

\- \'fix/\*\*\'

\- \'chore/\*\*\'

pull_request:

branches:

\- main

\- dev

jobs:

quality:

name: Quality Gate

runs-on: ubuntu-latest

timeout-minutes: 15

steps:

\- name: Checkout

uses: actions/checkout@v4

\- name: Setup pnpm

uses: pnpm/action-setup@v4

with:

version: 10.17.0

\- name: Setup Node.js

uses: actions/setup-node@v4

with:

node-version: \'22\'

cache: \'pnpm\'

\- name: Install dependencies

run: pnpm install \--frozen-lockfile

\- name: 1/5 TypeScript check

run: pnpm turbo type-check

\- name: 2/5 Lint

run: pnpm turbo lint

\- name: 3/5 Unit tests

run: pnpm turbo test

\- name: 4/5 Build Extension

run: pnpm turbo build \--filter=@brainbox/extension

\- name: 5/5 Build Dashboard

run: pnpm turbo build \--filter=@brainbox/dashboard

env:

NEXT_PUBLIC_SUPABASE_URL: \${{ secrets.NEXT_PUBLIC_SUPABASE_URL_DEV }}

NEXT_PUBLIC_SUPABASE_ANON_KEY: \${{
  secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV }}

---

**3.2 Deploy Notification**

**Файл: .github/workflows/deploy.yml**

Vercel деплоя автоматично при push в main/dev. Този workflow само логва
и може да се разшири.

---

name: 🚀 Deploy

on:

push:

branches:

\- main

\- dev

jobs:

deploy-info:

name: Deploy Info

runs-on: ubuntu-latest

steps:

\- uses: actions/checkout@v4

\- name: Log deployment target

run: \|

if \[ \'\${{ github.ref_name }}\' = \'main\' \]; then

echo \'🚀 PRODUCTION deployment triggered\'

else

echo \'🧪 STAGING (dev) deployment triggered\'

fi

\- name: Extension version check

run: \|

VERSION=\$(node -p
\"require(\'./apps/extension/package.json\').version\")

echo \"Extension version: \$VERSION\"

---

**4. Vercel Setup**

---

**✅ Плюсове** **❌ Минуси**

Zero-config за Next.js 14 + Serverless cold starts
Turborepo (незначително)

Preview URL за всеки PR автоматично При много трафик --- цената расте

Instant rollback с един клик Не контролираш инфраструктурата

Remote Cache за Turborepo builds Free tier: 1 бр. concurrent build

Edge CDN глобално без конфигурация

Environment variables по branch

---

**4.1 Project Settings в Vercel Dashboard**

---

**Настройка** **Стойност**

**Framework** Next.js (auto-detected)

**Root Directory** apps/dashboard

**Build Command** pnpm turbo build \--filter=@brainbox/dashboard

**Output Directory** .next

**Install Command** pnpm install \--frozen-lockfile

**Production Branch** main

**Preview Branch** dev → auto-deploys на staging URL

---

**4.2 Environment Variables**

Създай 2 отделни Supabase проекта: един за prod, един за dev/staging.

---

**Variable** **Environments** **Забележка**

NEXT_PUBLIC_SUPABASE_URL Production / Различни URL-и!
Preview

NEXT_PUBLIC_SUPABASE_ANON_KEY Production / Различни ключове!
Preview

SUPABASE_SERVICE_ROLE_KEY Production / SECRET --- никога public
Preview

NEXT_PUBLIC_APP_URL Production / https://brainbox.app /
Preview preview URL

AI_API_KEY Production / SECRET
Preview

UPSTASH_REDIS_REST_URL Production / SECRET
Preview

UPSTASH_REDIS_REST_TOKEN Production / SECRET
Preview

---

**5. Правила за агентите --- Задължителен протокол**

+-----------------------------------------------------------------------+
| **🤖 Всеки агент ТРЯБВА да следва тези правила без изключение** |
| |
| Тези правила се добавят в system prompt на всеки агент или в главния |
| MASTER_DOCUMENT. |
| |
| Нарушаването им = работата се reject-ва автоматично от GitHub branch |
| protection. |
+-----------------------------------------------------------------------+

**5.1 Git правила за агентите**

---

✅ Работи САМО в Docker container --- никога директно на хост машина

✅ Създавай feature бранч от dev: git checkout dev && git pull && git
checkout -b feature/описание

✅ Commit message задължителен формат: type(scope): description ---
пример: feat(dashboard): add search filter

✅ Пуши само твоя feature бранч: git push origin feature/описание

✅ Отваряй PR САМО към dev --- никога директно към main

✅ PR description задължително включва: Какво прави, Как е тествано,
Свързани файлове

❌ НИКОГА директен push към main или dev

❌ НИКОГА force push (git push \--force)

❌ НИКОГА да правиш миграции на Supabase без изрично разрешение

❌ НИКОГА да редактираш turbo.json, manifest.json без одобрение

❌ НИКОГА да създаваш повече от 1 feature бранч на задача

---

**5.2 Commit Message формат**

+-----------------------------------------------------------------------+
| **Позволени типове** |
| |
| feat --- нова функционалност |
| |
| fix --- bug fix |
| |
| chore --- поддръжка, dependencies, конфиг |
| |
| refactor --- рефакториране без нова функционалност |
| |
| test --- добавяне/промяна на тестове |
| |
| docs --- само документация |
| |
| style --- форматиране, без логически промени |
+-----------------------------------------------------------------------+

---

\# ✅ Правилни примери:

feat(dashboard): add folder color picker

fix(extension): resolve content script injection on ChatGPT

chore(deps): upgrade next.js to 14.2.5

test(validation): add prompt schema edge cases

\# ❌ Грешни примери:

update stuff

fixed bug

WIP

asdfgh

---

**5.3 Промпт за агент --- Agent Git Protocol**

+-----------------------------------------------------------------------+
| **🤖 ПРОМПТ 2 / Agent Git Protocol (добавя се в system prompt)** |
+-----------------------------------------------------------------------+
| === BRAINBOX GIT PROTOCOL --- MANDATORY === |
| |
| You are working on BrainBox monorepo. Follow these rules WITHOUT |
| EXCEPTION: |
| |
| BRANCH WORKFLOW: |
| |
| 1\. Always start from dev branch (git checkout dev && git pull origin |
| dev) |
| |
| 2\. Create feature branch: git checkout -b |
| feature/\<short-description\> |
| |
| Example: feature/add-folder-colors, fix/extension-injection |
| |
| 3\. Do your work, commit often |
| |
| 4\. Push ONLY your feature branch: git push origin feature/\<name\> |
| |
| 5\. Open PR targeting dev (NEVER main) |
| |
| COMMIT FORMAT (required): |
| |
| type(scope): description |
| |
| Types: feat \| fix \| chore \| refactor \| test \| docs \| style |
| |
| Example: feat(dashboard): add search filter to prompts list |
| |
| ABSOLUTE PROHIBITIONS: |
| |
| \- NEVER push directly to main or dev |
| |
| \- NEVER use git push \--force |
| |
| \- NEVER modify: turbo.json, manifest.json, supabase/migrations/\* |
| |
| \- NEVER create more than 1 branch per task |
| |
| \- NEVER merge your own PRs |
| |
| BEFORE ANY WORK verify you are in Docker container: |
| |
| cat /proc/1/cgroup \| grep docker → must show docker |
| |
| If Quality Gate CI fails: fix the issues, push again to same branch. |
| |
| === END PROTOCOL === |
+-----------------------------------------------------------------------+

**6. Промпти за настройка на инфраструктурата**

**6.1 CI/CD Setup Agent**

+-----------------------------------------------------------------------+
| **🤖 ПРОМПТ 3 / CI/CD Setup** |
+-----------------------------------------------------------------------+
| You are setting up GitHub Actions CI/CD for BrainBox monorepo. |
| |
| TASK: Create two workflow files exactly as specified. |
| |
| FILE 1: .github/workflows/quality-gate.yml |
| |
| \- Triggers: push to dev/feature\*\*/fix\*\*/chore\*\*, PR to |
| main/dev |
| |
| \- Steps: checkout → pnpm setup (v10.17.0) → node 22 → install |
| |
| → type-check → lint → test → build extension → build dashboard |
| |
| \- Env vars for dashboard build use secrets: |
| |
| NEXT_PUBLIC_SUPABASE_URL: \${{ secrets.NEXT_PUBLIC_SUPABASE_URL_DEV   |
| }} |
| |
| NEXT_PUBLIC_SUPABASE_ANON_KEY: \${{                                   |
| secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV }} |
| |
| FILE 2: .github/workflows/deploy.yml |
| |
| \- Triggers: push to main and dev |
| |
| \- Single job: log which environment was deployed |
| |
| \- Note: actual deploy is handled by Vercel GitHub integration |
| |
| ALSO CREATE: .github/pull_request_template.md with: |
| |
| \- \## What does this PR do? |
| |
| \- \## How was it tested? |
| |
| \- \## Checklist: \[ \] type-check \[ \] lint \[ \] tests \[ \] no |
| direct main/dev push |
| |
| Do NOT modify any other files. |
| |
| Commit with: chore(ci): add quality gate and deploy workflows |
| |
| Push to feature/ci-setup, open PR to dev. |
+-----------------------------------------------------------------------+

**6.2 Vercel Setup Agent**

+-----------------------------------------------------------------------+
| **🤖 ПРОМПТ 4 / Vercel Configuration** |
+-----------------------------------------------------------------------+
| You are configuring Vercel for BrainBox Next.js dashboard. |
| |
| TASK: Configure the Vercel project with correct settings. |
| |
| VERCEL PROJECT SETTINGS: |
| |
| Framework Preset: Next.js |
| |
| Root Directory: apps/dashboard |
| |
| Build Command: pnpm turbo build \--filter=@brainbox/dashboard |
| |
| Output Directory: .next |
| |
| Install Command: pnpm install \--frozen-lockfile |
| |
| GIT SETTINGS: |
| |
| Production Branch: main |
| |
| Preview deployments: enabled for all branches |
| |
| ENVIRONMENT VARIABLES --- set these in Vercel Dashboard: |
| |
| For PRODUCTION environment: |
| |
| NEXT_PUBLIC_SUPABASE_URL = \<prod supabase URL\> |
| |
| NEXT_PUBLIC_SUPABASE_ANON_KEY = \<prod anon key\> |
| |
| SUPABASE_SERVICE_ROLE_KEY = \<prod service role\> |
| |
| AI_API_KEY = \<api key\> |
| |
| For PREVIEW environment: |
| |
| NEXT_PUBLIC_SUPABASE_URL = \<dev supabase URL\> |
| |
| NEXT_PUBLIC_SUPABASE_ANON_KEY = \<dev anon key\> |
| |
| SUPABASE_SERVICE_ROLE_KEY = \<dev service role\> |
| |
| AI_API_KEY = \<api key\> |
| |
| TURBOREPO REMOTE CACHE: |
| |
| Run: npx turbo link → connect to Vercel Remote Cache |
| |
| CREATE FILE: apps/dashboard/.env.example with all variables (no |
| values) |
| |
| Commit: chore(vercel): add env example file |
| |
| Do NOT commit .env.local or any real secrets. |
+-----------------------------------------------------------------------+

**6.3 Supabase Dual Project Setup**

+-----------------------------------------------------------------------+
| **🤖 ПРОМПТ 5 / Supabase Dev/Prod Split** |
+-----------------------------------------------------------------------+
| You are setting up two Supabase environments for BrainBox. |
| |
| GOAL: prod Supabase project + dev/staging Supabase project |
| |
| STEP 1 --- Create dev Supabase project: |
| |
| 1\. Go to supabase.com → New Project |
| |
| 2\. Name: brainbox-dev (or brainbox-staging) |
| |
| 3\. Same region as prod project |
| |
| 4\. Note the URL and keys |
| |
| STEP 2 --- Apply migrations to dev project: |
| |
| 1\. Install Supabase CLI if not present |
| |
| 2\. Link to dev project: supabase link \--project-ref |
| \<dev-project-ref\> |
| |
| 3\. Push migrations: supabase db push |
| |
| 4\. Verify: supabase db diff → should show no diff |
| |
| STEP 3 --- Update local .env.local: |
| |
| NEXT_PUBLIC_SUPABASE_URL=\<dev project URL\> |
| |
| NEXT_PUBLIC_SUPABASE_ANON_KEY=\<dev anon key\> |
| |
| SUPABASE_SERVICE_ROLE_KEY=\<dev service role key\> |
| |
| STEP 4 --- Add GitHub Secrets: |
| |
| In GitHub repo Settings → Secrets → Actions, add: |
| |
| NEXT_PUBLIC_SUPABASE_URL_DEV = \<dev URL\> |
| |
| NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV = \<dev anon key\> |
| |
| NEXT_PUBLIC_SUPABASE_URL_PROD = \<prod URL\> |
| |
| NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD = \<prod anon key\> |
| |
| RULE: Never run migrations on prod without testing on dev first. |
| |
| RULE: Never hardcode credentials anywhere in code. |
+-----------------------------------------------------------------------+

**7. Master Setup Checklist**

Изпълни в този ред. Не прескачай стъпки.

---

**\#** **Done** **Задача**

**1** ☐ **\[Git Cleanup\]** Провери всички бранчове (git branch -a)

**2** ☐ **\[Git Cleanup\]** Преименувай feature/local-supabase → dev

**3** ☐ **\[Git Cleanup\]** Изтрий всички излишни бранчове

**4** ☐ **\[Supabase\]** Създай dev Supabase проект

**5** ☐ **\[Supabase\]** Приложи migrations към dev проект

**6** ☐ **\[GitHub\]** Добави branch protection rules за main

**7** ☐ **\[GitHub\]** Добави branch protection rules за dev

**8** ☐ **\[GitHub\]** Добави GitHub Secrets (Supabase ключове)

**9** ☐ **\[CI/CD\]** Създай .github/workflows/quality-gate.yml

**10** ☐ **\[CI/CD\]** Създай .github/workflows/deploy.yml

**11** ☐ **\[CI/CD\]** Създай .github/pull_request_template.md

**12** ☐ **\[CI/CD\]** Тествай: направи PR и провери дали CI се
стартира

**13** ☐ **\[Vercel\]** Свържи GitHub repo с Vercel project

**14** ☐ **\[Vercel\]** Настрой Build Settings (Root Directory, Build
Command)

**15** ☐ **\[Vercel\]** Добави Environment Variables (Prod + Preview)

**16** ☐ **\[Vercel\]** Провери auto-deploy: push към dev → Preview URL

**17** ☐ **\[Vercel\]** Провери auto-deploy: PR→merge към main →
Production

**18** ☐ **\[Docker\]** Потвърди container работи с dev Supabase

**19** ☐ **\[Agent Rules\]** Добави Git Protocol в system prompt на
агентите

**20** ☐ **\[Final Test\]** Направи пълен цикъл: feature → PR → dev →
PR → main

---

BrainBox DevOps Guide • Генериран: 2026-03-01 • Version 1.0
