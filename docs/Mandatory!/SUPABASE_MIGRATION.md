# SUPABASE_MIGRATION.md

> **Статус:** Критичен за инфраструктурата.  
> **Версия:** 1.0.0 | **Дата:** 2026-03-02  
> **Цел:** Процедура за смяна на Supabase проект или възстановяване на връзката при десинхронизация.

---

## 🚀 Бърз чек-лист (TL;DR)

1. [ ] **Supabase:** Site URL + Redirect URIs.
2. [ ] **Supabase:** Google Client ID + Secret.
3. [ ] **Google Cloud:** Authorized Redirect URIs (matching Supabase callback).
4. [ ] **Vercel:** Update Env Vars (URL + Anon Key).
5. [ ] **Local:** CLI `supabase link`.

---

## 1. Supabase Dashboard Конфигурация

### Authentication Settings
- **Site URL:** 
  - Разработка: `http://localhost:3000`
  - Продукция: `https://brainbox-alpha.vercel.app`
- **Redirect URIs (Allow List):**
  - `http://localhost:3000/**`
  - `https://brainbox-alpha.vercel.app/**`
- **Email Auth:** Изключи "Confirm signup" за тестване (ако е необходимо).

### Auth Providers (Google)
- **Enabled:** TRUE
- **Client ID:** От Google Cloud Console.
- **Client Secret:** От Google Cloud Console.
- **Supabase Callback URL:** Копирай това (напр. `https://xxx.supabase.co/auth/v1/callback`) -> отива в Google Cloud.

---

## 2. Google Cloud Platform (GCP) Конфигурация

### API & Services > Credentials
- **OAuth 2.0 Client IDs:** Използвай съществуващия или създай нов (Web application).
- **Authorized JavaScript origins:** 
  - `http://localhost:3000`
  - `https://brainbox-alpha.vercel.app`
- **Authorized redirect URIs:**
  - **КРИТИЧНО:** Трябва да съдържа САМО Supabase Callback URL-а. 
  - ПРЕМЕХНИ всякакви директни Vercel или localhost callbacks тук (те се обслужват от Supabase).

---

## 3. Environment Variables (Environment Sync)

### Локални файлове (.env)
Актуализирай следните стойности в корена и в `apps/dashboard/.env`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Vercel Dashboard
Актуализирай `Site Settings -> Environment Variables` за Production, Preview и Development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN` (за CLI операции)

---

## 4. CLI & Database Link

Синхронизирай локалната машина с новия проект:

```bash
# 1. Login (ако не си)
supabase login

# 2. Link към проекта
supabase link --project-ref your-project-ref

# 3. Pull на схемата (ако проектът има съществуващи данни)
supabase db pull

# 4. Push на миграциите (ако е нов проект)
supabase db push
```

---

## 5. Проверка на Redirect Logic

В кода на Dashboard (`apps/dashboard/src/app/auth/signin/page.tsx`), функцията за логин трябва да използва динамично `window.location.origin`:

```typescript
const handleGoogleSignIn = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};
```

---

## 6. Критични точки за наблюдение

1. **Infinity Redirect Loop:** Обикновено означава грешен `Site URL` в Supabase или липсващ `callback` route в Next.js.
2. **"Unable to exchange external code":** Провери дали `Client Secret` в Supabase съвпада с този в Google Cloud.
3. **403 Forbidden (Vercel):** Провери дали `NEXT_PUBLIC_SUPABASE_URL` е коректен в Vercel Settings (Build-ът може да се е счупил).
4. **CORS грешки в Extension:** Провери дали `NEXT_PUBLIC_SUPABASE_URL` е същият в Extension конфигурацията.

---

## 7. Възстановяване на Seed данни (Local)

Ако искаш да върнеш тестовия потребител в локалната база:
```bash
supabase db reset
```
*(Това ще изпълни `supabase/seed.sql`)*
