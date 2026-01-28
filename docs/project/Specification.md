# 📋 Пълен Списък на Функционалностите - AI Chat Organizer

**Дата:** 2025-01-14  
**Версия:** 2.0

---

## 🏠 Главни Раздели (Navigation)

### 1. **Dashboard** (`/`)
- Главна страница с всички чатове
- Grid layout с chat cards
- Real-time search и филтри
- Export функционалност

### 2. **Archive** (`/archive`)
- Архивирани чатове
- Restore функционалност
- Permanent delete

### 3. **Prompts** (`/prompts`)
- Prompt Manager
- Създаване и управление на prompts
- Color markers за prompts

### 4. **Profile** (`/profile`)
- Account информация
- Change password
- Sign out

### 5. **Settings** (`/settings`)
- Theme настройки (Light/Dark/System)
- Avatar upload (PRO feature)
- Export/Import данни (JSON/Markdown) - ✅ Implemented
- Extension Quick Access (Synced across devices) - ✅ Implemented
- Account deletion

### 6. **Folders** (в Sidebar)
- Списък с всички папки
- Създаване на нови папки
- Редактиране на папки
- Изтриване на папки
- Color coding за папки

### 7. **Chat** (`/chat`) (Планирано - T62)
- Директно чатиране с AI платформи
- AI selector dropdown (ChatGPT, Claude, Gemini)
- Chat interface с messages
- Save Chat функционалност

---

## 💬 Chat Функционалности

### Създаване на Chat
- **New Chat** бутон (Dashboard)
- **CreateChatModal** с полета:
  - Title (задължително)
  - Chat URL (опционално)
  - Folder (dropdown - опционално)
  - Platform (ChatGPT, Claude, Gemini, Other)
  - AI generate button (PRO feature - скрит за не-PRO)

### Chat Card Опции
- **Edit** - Редактиране на chat (title, URL, folder, platform)
- **Archive** - Архивиране на chat
- **Restore** - Възстановяване от архив
- **Delete** - Изтриване на chat
- **Move to Folder** (планирано - T57)
- **Generate Summary** (PRO feature - скрит за не-PRO)
- **Extract Tasks** (PRO feature - скрит за не-PRO)
- **Open Chat** - Отваряне на source URL в нов tab

### Chat Информация
- Platform badge (ChatGPT, Claude, Gemini, Other)
- Title с link към source URL
- Summary (markdown rendering)
- Tasks list (ако има)
- Created date (relative или absolute format)

---

## 📁 Folder Функционалности

### Създаване на Folder
- **+** бутон до "Folders" в Sidebar
- **CreateFolderModal** с:
  - Name (задължително)
  - Color picker (опционално)

### Folder Опции
- **Edit** - Редактиране на име и цвят
- **Delete** - Изтриване на папка (и всички чатове в нея)
- **View** - Отваряне на страница с чатове в папката

### Folder Страница (`/folder/[id]`)
- Показва всички чатове в папката
- Delete Folder бутон
- Back to Dashboard link

---

## 🔍 Search & Filter Функционалности

### Search Bar
- Real-time търсене по title, summary, platform
- Instant results (без натискане на Enter)
- Clear search бутон

### Search Filters
- **Platform Filter:**
  - ChatGPT
  - Claude
  - Gemini
  - Other
  - All (default)

- **Folder Filter:**
  - All Folders
  - No Folder (Uncategorized)
  - Конкретна папка

- **Date Range Filter:**
  - Date From
  - Date To
  - Clear filters бутон

---

## 📤 Export & Import

### Export Опции
- **Export as Markdown** - Експорт на всички чатове като Markdown файл
- **Export as JSON** - Експорт на всички чатове като JSON backup
- Доступни от Dashboard (Export dropdown)

### Import Опции
- **Import from JSON** - Импорт на чатове и папки от JSON backup
- Доступни от Settings страница
- Валидация на JSON структура
- Обработка на конфликти (дублирани записи)

---

## 🤖 AI Функционалности (PRO Feature)

### Generate Summary
- Автоматично генериране на резюме на чат
- Използва Gemini API
- Показва се в ChatCard като summary
- Markdown rendering

### Extract Tasks
- Автоматично извличане на задачи от чат
- Използва Gemini API
- Показва се като tasks list в ChatCard

### AI Generate (в CreateChatModal)
- Автоматично генериране на title и summary
- Използва Gemini API
- Скрит за не-PRO потребители

**Важно:** Всички AI функции са скрити за не-PRO потребители.

---

## 🎨 UI & UX Функционалности

### Dark Mode
- **Light Mode** - Светла тема
- **Dark Mode** - Тъмна тема
- **System** - Следва system preferences
- Настройка от Settings страница

### Responsive Design
- **Desktop** - Пълен layout с sidebar
- **Tablet** - Адаптиран layout
- **Mobile** - Mobile-friendly с hamburger menu

### Drag & Drop
- Преместване на чатове между папки
- Визуална индикация при drag
- Drop zones за папки

### Animations & Transitions
- Smooth transitions
- Hover effects
- Loading states
- Toast notifications

---

## 🔐 Authentication & Security

### Sign Up
- Email и password регистрация
- **Google OAuth регистрация** (Планирано - T61)
- Password validation (8+ chars, uppercase, lowercase, number, special)
- Real-time password strength indicator

### Sign In
- Email и password вход
- **Google OAuth вход** (Планирано - T61)
- Remember me функционалност
- Redirect след успешен вход

### Sign Out
- Sign out от Profile страница
- Clear session и redirect към auth

### Password Management
- Change password от Profile страница
- Password strength indicator
- Password validation

### Account Deletion
- Delete account от Settings страница
- Confirmation modal (трябва да напишеш "DELETE")
- Изтрива всички данни (chats, folders, prompts)

---

## 📱 PWA (Progressive Web App)

### Install Prompt
- Install prompt за desktop и mobile
- PWA manifest.json
- Service worker за offline support

### Offline Support
- Service worker caching
- Offline mode (планирано)

---

## 🌉 Chrome Extension

### One-Click Save
- Extension icon click → запазва чат
- Автоматично извличане на content
- Отваря `/save` страница с pre-filled данни

### Context Menu
- Right-click на ChatGPT/Claude/Gemini страница
- "Save to AI Chat Organizer" опция
- Автоматично извличане на content

### Content Extraction
- Multi-strategy extraction за ChatGPT
- Multi-strategy extraction за Claude
- Multi-strategy extraction за Gemini
- Fallback стратегии

### Platform Detection
- Автоматично детектиране на платформа
- Platform badge в запазените чатове

---

## 📝 Prompt Manager

### Създаване на Prompt
- **New Prompt** бутон
- **CreatePromptModal** с:
  - Name (задължително)
  - Content (задължително)
  - Color marker (опционално)

### Prompt Опции
- **Edit** - Редактиране на prompt
- **Delete** - Изтриване на prompt
- **Copy** - Копиране на prompt content

### Prompt List
- Grid layout с prompt cards
- Color markers за визуална организация
- Search функционалност (планирано)

---

## 🎯 Планирани Функционалности (Coming Soon)

### Google Authentication (T61)
- **Continue with Google** бутон в auth страницата
- Google OAuth integration
- Автоматична регистрация/логин с Google акаунт

### Chat Section (T62)
- **Нов раздел `/chat`** - Директно чатиране с AI
- AI selector dropdown (ChatGPT, Claude, Gemini)
- Chat interface с message history
- Save Chat функционалност
- Интеграция с Gemini API (започва с Gemini, после OpenAI/Anthropic)

### ❌ Images Feature (ПРЕМАХНАТО - 2026-01-27)
- Тази функционалност е премахната от текущата версия на проекта.
- Всички референции в разширението и таблото са изтрити или скрити.

### Dropdown Menu (T56-T57)
- **Три точки меню** - Dropdown меню в ChatCard
- **Move to Folder** - Преместване на чатове в папки

### Extension Prompts (T58)
- **Right-click Insert Prompt** - Вмъкване на prompts в AI платформите
- **Prompts Popup** - Extension popup с prompts списък

### Extension Three Dots (T60)
- **Три точки в AI платформите** - Инжектиране в Gemini/ChatGPT/Claude
- **Add to AI Chat Organizer** - Dropdown меню опция

---

## 🔧 Технически Функционалности

### Error Handling
- Error boundaries
- Toast notifications за errors
- Sentry error tracking (production)

### Loading States
- Spinner компонент
- Skeleton loaders
- Loading indicators

### Notifications
- Toast notifications (Sonner)
- Success/Error/Info messages
- Auto-dismiss

### Data Validation
- Zod schemas за валидация
- Client-side validation
- Server-side validation

### Security
- RLS (Row Level Security) в Supabase
- Password validation
- File upload validation (magic bytes)
- XSS protection

### Data Integrity & Sync
- **Rich Data Storage (JSONB)** - ✅ Implemented: Съхраняване на пълна хронология (roles, timestamps, content)
- **Duplicate Prevention** - ✅ Implemented: Използване на `source_id` и `upsert` логика
- **Settings Sync** - ✅ Implemented: Синхронизиране на Quick Access папки между Dashboard и Extension


---

## 📊 Статистики & Информация

### User Information
- Email
- Member since date
- Account creation date

### Chat Statistics
- Общ брой чатове
- Чатове по платформа
- Чатове по папка
- Archived чатове

---

## 🎨 Визуални Елементи

### Icons
- Material Symbols icons
- Lucide React icons
- Platform-specific icons

### Colors
- Primary color (blue)
- Folder colors (customizable)
- Platform badges (ChatGPT=green, Claude=orange, Gemini=blue, Other=gray)

### Glass Panel Design
- Glass morphism ефект
- Backdrop blur
- Border effects
- Shadow effects

---

## ⌨️ Keyboard Shortcuts

- **Enter** в CreateChatModal → Submit
- **Escape** → Close modal
- **Arrow keys** в dropdowns (планирано)

---

## 📱 Mobile Опции

### Mobile Menu
- Hamburger menu button
- Slide-in sidebar
- Touch-friendly buttons
- Responsive modals

---

## 🔄 Real-time Updates

### Auto-refresh
- Автоматично обновяване на данни
- Real-time search
- Instant filter results

---

## 🎁 PRO Features (Скрити за не-PRO)

- **Generate Summary** бутон
- **Extract Tasks** бутон
- **AI Generate** бутон в CreateChatModal
- **Avatar Upload** (планирано)

---

## 📚 Референции

- `README.md` - Основна документация
- `TESTING.md` - Testing guide
- `docs/` - Детайлна документация
- `src/app/` - Страници
- `src/components/features/` - Компоненти

---