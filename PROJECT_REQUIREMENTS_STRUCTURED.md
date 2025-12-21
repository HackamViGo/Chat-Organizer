# 📄 AI Chat Organizer - Структуриран Документ с Изисквания

## 1. ОСНОВНА ИНФОРМАЦИЯ

### 1.1. Наименование
**AI Chat Organizer** - Intelligent Knowledge Manager for AI Conversations

### 1.2. Тип Приложение
**Web Application (PWA - Progressive Web App)**
- Cross-platform web приложение
- Може да се инсталира като нативно приложение
- Работи офлайн (offline-first архитектура)

### 1.3. Основна Цел
Решава проблема с разпръснатите AI разговори в различни платформи (ChatGPT, Gemini, Claude), предоставяйки единна платформа за съхранение, организиране, търсене и анализ на всички AI разговори.

---

## 2. ТАРГЕТИРАНА ПЛАТФОРМА И СРЕДА

### 2.1. Целева Платформа
**Cross-platform Web:**
- Windows (Desktop browsers)
- Linux (Desktop browsers)
- macOS (Desktop browsers)
- Android (Mobile browsers + PWA)
- iOS (Mobile browsers + PWA)

### 2.2. Минимални Изисквания
- **Браузър:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript:** Enabled
- **Интернет:** За първоначална синхронизация (офлайн режим след това)
- **Разрешение:** Минимум 320px ширина (mobile-first design)

### 2.3. Deployment Среда
- **Production:** Vercel (рекомендувано) или друг Next.js hosting
- **Development:** Local development с Next.js dev server
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (за avatars и изображения)

---

## 3. СПЕЦИАЛНИ ИЗИСКВАНИЯ

### 3.1. Offline-First Архитектура
- PWA функционалност - Service Worker за офлайн кеширане
- Офлайн режим - Работа без интернет след първоначална синхронизация
- Install prompt - Възможност за инсталация като нативно приложение
- Offline indicators - Визуална индикация за офлайн статус

### 3.2. AI Integration
- Google Gemini API - За AI резюмета и извличане на задачи
- Rate Limiting - Upstash Redis за контрол на API заявки
- Streaming Support - За бъдещи real-time AI отговори
- Future: OpenAI API, Anthropic Claude API интеграция

### 3.3. Real-time Функционалности
- Real-time Search - Моментално търсене без забавяне
- Instant Filtering - Реално време филтриране на резултати
- Future: Real-time синхронизация между устройства (Supabase Realtime)

### 3.4. Security Изисквания
- Row Level Security (RLS) - Задължително за всички таблици
- Authentication - Supabase Auth (Email/Password + Google OAuth)
- Data Encryption - HTTPS за всички комуникации
- Input Validation - Zod schemas за всички входни данни
- XSS Protection - React автоматична защита + sanitization
- File Upload Security - Magic bytes validation за изображения

### 3.5. Performance Изисквания
- Fast Initial Load - под 3 секунди за първоначално зареждане
- Optimistic Updates - UI обновяване преди server response
- Lazy Loading - Code splitting за по-бързо зареждане
- Image Optimization - Next.js Image компонент + AVIF конверсия

---

## 4. ОСНОВНА ФУНКЦИОНАЛНОСТ И БИЗНЕС ЛОГИКА

### 4.1. Core Features

#### 4.1.1. Authentication & User Management
- Sign Up/Sign In - Email/Password + Google OAuth
- User Profile - Email, avatar, member since date
- Password Management - Change password с validation
- Account Deletion - Пълно изтриване на данни с confirmation

#### 4.1.2. Chat Management
- Save Chats - Запазване на чатове с URL, title, content
- Platform Detection - Автоматично разпознаване (ChatGPT, Claude, Gemini, Other)
- Edit Chats - Редактиране на title, URL, folder, platform
- Delete Chats - Изтриване с confirmation
- Archive/Restore - Архивиране и възстановяване на чатове

#### 4.1.3. Organization System
- Folders - Създаване, редактиране, изтриване на папки
- Color Coding - Цветно кодиране на папки за визуална организация
- Drag & Drop - Преместване на чатове между папки
- Folder Pages - Страници за чатове в конкретна папка

#### 4.1.4. Search & Discovery
- Real-time Search - Моментално търсене по title, summary, platform
- Full-Text Search - PostgreSQL Full-Text Search (TSVector)
- Filters - Platform filter, Folder filter, Date range filter
- Search Results - Instant results без забавяне

#### 4.1.5. AI Features (PRO)
- AI Summaries - Автоматично генериране на резюмета с Gemini API
- Task Extraction - Автоматично извличане на задачи от разговори
- AI Generate - Автоматично генериране на title и summary при създаване

#### 4.1.6. Prompt Manager
- Create Prompts - Създаване на reusable prompts
- Color Markers - Цветни маркери за визуална организация
- Edit/Delete - Редактиране и изтриване на prompts
- Copy to Clipboard - Копиране на prompt content

#### 4.1.7. Export & Import
- Export as Markdown - Експорт на всички чатове като Markdown
- Export as JSON - Експорт като JSON backup
- Import from JSON - Импорт на чатове и папки от backup

### 4.2. Chrome Extension Features
- One-Click Save - Запазване на чатове с един клик
- Content Extraction - Автоматично извличане на content от AI платформи
- Context Menu - Right-click опция "Save to AI Chat Organizer"
- Three Dots Menu - Инжектиране в AI платформите за бързо запазване
- Prompt Selector - Right-click избор на prompts за вмъкване

### 4.3. UI/UX Features
- Dark Mode - Пълна поддръжка на Light/Dark теми
- Responsive Design - Mobile, Tablet, Desktop оптимизация
- Glass Morphism - Модерен glass panel дизайн
- Animations - Smooth transitions и hover effects
- Toast Notifications - User feedback за всички действия
- Loading States - Spinners и skeleton loaders

---

## 5. ИНТЕГРАЦИИ

### 5.1. Бази Данни
- **Supabase PostgreSQL** - Основна база данни
  - Таблици: `users`, `folders`, `chats`, `prompts`, `images`, `image_folders`
  - RLS policies за всички таблици
  - Full-Text Search с TSVector
  - Performance indexes

### 5.2. Външни API-та
- **Google Gemini API** - За AI резюмета и task extraction
- **Supabase Auth API** - За authentication
- **Supabase Storage API** - За file uploads (avatars, images)
- **Upstash Redis** - За rate limiting

### 5.3. Хардуер (Future)
- Camera API - За scan на документи (mobile)
- File System API - За direct file access (desktop PWA)

---

## 6. МАЩАБ

### 6.1. Текущ Мащаб
**Personal/Small Team Application:**
- Индивидуални потребители
- Малки екипи (до 10 човека)
- Лични проекти и изследвания

### 6.2. Очакван Обем Данни
- Chats per user: До 10,000 чата
- Folders per user: До 500 папки
- Storage per user: До 1GB (включително images)
- Concurrent users: До 1,000 активни потребители

### 6.3. Performance Targets
- Page Load Time: под 3 секунди
- Search Response: под 500ms
- API Response: под 1 секунда
- Database Queries: под 100ms (average)

### 6.4. Scalability Plan
- Phase 1 (Current): Single instance, Supabase free tier
- Phase 2 (Future): Supabase Pro tier, CDN за статични файлове
- Phase 3 (Future): Multi-region deployment, caching layer

---

## 7. ТЕХНИЧЕСКИ ИЗИСКВАНИЯ

### 7.1. Frontend Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4.0
- **State Management:** Zustand
- **Icons:** Lucide React, Material Symbols
- **Forms:** React Hook Form + Zod validation
*Тази конфигурация вече отговаря на изискването за Next.js със Zustand.*

### 7.2. Backend Stack
- **Runtime:** Node.js 18.18.0+
- **API:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage

### 7.3. DevOps & Tools
- **Deployment:** Vercel (рекомендувано)
- **CI/CD:** GitHub Actions (planned)
- **Error Tracking:** Sentry
- **Testing:** Jest + React Testing Library + Playwright
- **Code Quality:** ESLint + Prettier + Husky

---

## 8. NON-FUNCTIONAL ИЗИСКВАНИЯ

### 8.1. Usability
- Accessibility: WCAG 2.1 AA compliance
- Internationalization: English (primary), Bulgarian (planned)
- Keyboard Navigation: Пълна поддръжка на keyboard shortcuts
- Mobile Touch: Touch-friendly интерфейс за mobile

### 8.2. Reliability
- Uptime: 99.9% availability
- Error Handling: Graceful error handling с user-friendly messages
- Data Backup: Automated backups на Supabase
- Recovery: Export/Import функционалност за data recovery

### 8.3. Maintainability
- Code Quality: TypeScript strict mode, ESLint rules
- Documentation: Comprehensive documentation в `docs/`
- Testing: Unit tests за критични компоненти
- Code Review: Pull request workflow

---

## 9. CONSTRAINTS

### 9.1. Technical Constraints
- Browser Support: Modern browsers only (no IE11)
- API Limits: Gemini API rate limits (controlled с Upstash)
- Storage Limits: Supabase free tier limits (upgrade needed for scale)

### 9.2. Business Constraints
- Budget: Free tier services initially
- Timeline: Agile development с iterative releases
- Resources: Small team development

---

## 10. SUCCESS CRITERIA

### 10.1. Functional Success
- Всички core features работят без грешки
- Chrome Extension успешно запазва чатове
- AI features генерират качествени резюмета
- Search намира релевантни резултати

### 10.2. Non-Functional Success
- Page load под 3 секунди
- Mobile responsive на всички устройства
- Dark mode работи коректно
- Offline mode функционира правилно

---

**Последна актуализация:** 2025-01-17
