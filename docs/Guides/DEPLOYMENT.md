# DEPLOYMENT.md

> **Stack:** pnpm + Turborepo + Vercel (Dashboard) + Chrome Web Store (Extension)  
> **Принцип:** Никога директен push към `main`. Всичко минава през PR + CI.

---

## Branches

| Branch | Цел | Deploy |
|--------|-----|--------|
| `main` | Production-ready код | Auto-deploy → Vercel Production |
| `develop` | Integration branch | Auto-deploy → Vercel Preview |
| `feature/*` | Нова функционалност | Preview при PR |
| `fix/*` | Bug fix | Preview при PR |
| `hotfix/*` | Critical production fix | Merge директно в main + tag |

**Правило:** Никога `git push origin main`. Единственото изключение е `hotfix/*` след одобрен emergency review.

---

## CI/CD Pipeline (GitHub Actions)

### При всеки Push / Pull Request

```
Push to feature/* или fix/*
        │
        ▼
┌───────────────────────┐
│  CI: quality-gate.yml │
│                       │
│  1. pnpm install      │
│  2. Type check        │
│  3. Lint              │
│  4. Unit tests        │
│  5. Coverage check    │
│     (Lines ≥ 85%,     │
│      Branches ≥ 80%)  │
│  6. Extension build   │
│  7. Dashboard build   │
└───────────┬───────────┘
            │
            ▼ (всичко минава)
     PR може да се merge
```

### При Merge в `main`

```
Merge в main
      │
      ▼
┌─────────────────────┐
│  CI: quality-gate   │  (повторно — за safety)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  CD: deploy.yml     │
│                     │
│  Vercel auto-deploy │
│  (production)       │
└─────────────────────┘
```

---

## GitHub Actions файлове

### `.github/workflows/quality-gate.yml`

```yaml
name: Quality Gate

on:
  push:
    branches: ['feature/**', 'fix/**', 'develop']
  pull_request:
    branches: ['main', 'develop']

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 10.17.0
          
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Type check
        run: pnpm turbo type-check
        
      - name: Lint
        run: pnpm turbo lint
        
      - name: Unit tests
        run: pnpm turbo test --filter=@brainbox/extension
        
      - name: Coverage check
        run: |
          pnpm turbo test:coverage --filter=@brainbox/extension
          node scripts/check-coverage.js
          
      - name: Build Extension
        run: pnpm turbo build --filter=@brainbox/extension
        
      - name: Build Dashboard
        run: pnpm turbo build --filter=@brainbox/dashboard
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: ['main']

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: []  # Vercel handles its own deploy trigger
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Notify deployment started
        run: echo "Deployment triggered by merge to main"
        
      # Vercel deploy се случва автоматично чрез Vercel GitHub integration
      # Този job е за notification и future extension packaging
      
      - name: Package Extension (if version changed)
        run: |
          VERSION=$(node -p "require('./apps/extension/package.json').version")
          echo "Extension version: $VERSION"
          # Future: auto-submit to Chrome Web Store
```

---

## Vercel Настройка

### Environment Variables в Vercel Dashboard

| Variable | Environment | Стойност |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Secret** — не се споделя |
| `AI_API_KEY` | Production + Preview | **Secret** |
| `UPSTASH_REDIS_REST_URL` | Production + Preview | **Secret** |
| `UPSTASH_REDIS_REST_TOKEN` | Production + Preview | **Secret** |

**Vercel Project Settings:**
- Root Directory: `apps/dashboard`
- Build Command: `pnpm build` (Turborepo кешира)
- Output Directory: `.next`
- Install Command: `pnpm install --frozen-lockfile`

---

## Build команди

```bash
# Локална разработка
pnpm dev                          # Dashboard + Extension паралелно

# Верификация (преди PR)
pnpm turbo type-check             # TypeScript
pnpm turbo lint                   # ESLint
pnpm turbo test                   # Тестове
pnpm turbo build                  # Production build на всичко

# Само Extension
pnpm turbo build --filter=@brainbox/extension

# Само Dashboard
pnpm turbo build --filter=@brainbox/dashboard

# Изчистване при проблеми с типове
pnpm clean && pnpm install
```

---

## Extension Deploy (Chrome Web Store)

Extension-ът се deploy-ва ръчно при нова версия:

```bash
# 1. Bump версията в apps/extension/package.json и manifest.json
# 2. Build
pnpm turbo build --filter=@brainbox/extension

# 3. Zip дистрибуцията
cd apps/extension/dist && zip -r ../brainbox-extension-v{VERSION}.zip .

# 4. Качи ръчно в Chrome Web Store Developer Dashboard
# Future: автоматизирай с chrome-webstore-upload-cli
```

---

## Rollback

### Dashboard Rollback (Vercel)

```bash
# 1. В Vercel Dashboard → намери последния working deployment
# 2. "Promote to Production" → instant rollback без downtime

# Или чрез Vercel CLI:
vercel rollback [deployment-url]
```

### Database Rollback

```bash
# Supabase migrations са в supabase/migrations/
# За rollback — пиши нова migration, не редактирай стара

# Пример rollback migration:
# supabase/migrations/20260210_rollback_column_x.sql
ALTER TABLE chats DROP COLUMN IF EXISTS problematic_column;
```

**Правило:** Никога не редактирай вече изпълнена migration. Пиши нова.

### Extension Rollback

- Publish предишната версия от Chrome Web Store Developer Dashboard
- Update се разпространява в рамките на часове

---

## Health Checks

### След всеки deploy провери:

```bash
# 1. Dashboard е достъпен
curl -f https://your-domain.com/api/health  # трябва да върне 200

# 2. Supabase connection работи
# (проверява се в Supabase Dashboard → Database → Health)

# 3. Extension работи в Chrome
# - Отвори ChatGPT, изпрати съобщение
# - Провери дали се появява в Dashboard
```

### Автоматичен health check endpoint

```typescript
// apps/dashboard/src/app/api/health/route.ts
export async function GET() {
  const supabase = await createServerClient()
  const { error } = await supabase.from('chats').select('id').limit(1)
  
  if (error) {
    return NextResponse.json({ status: 'unhealthy', error: error.message }, { status: 503 })
  }
  
  return NextResponse.json({ 
    status: 'healthy',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString()
  })
}
```
