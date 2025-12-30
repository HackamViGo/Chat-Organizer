# 📋 TODO - Пълен Списък на Функционалностите

**Дата:** 2025-01-15  
**Базирано на:** `docs/project/Specification.md`

**Легенда:**
- ✅ = Готово/Имплементирано
- ⚠️ = Частично готово/В процес
- ❌ = Не е имплементирано
- 🔄 = Планирано

---

## 🏠 Главни Раздели (Navigation)

### ✅ Dashboard (`/`)
- ✅ Главна страница с всички чатове
- ✅ Grid layout с chat cards
- ✅ Real-time search и филтри
- ✅ Export функционалност (JSON и Markdown)
- ✅ User Information (Email, Member Since)
- ✅ Chat Statistics (Total, By Platform, By Folder, Archived)
- ✅ Model Usage Chart (реални данни за последните 7 дни)
- ✅ Monthly Usage (реални данни)

### ✅ Archive (`/archive`)
- ✅ Архивирани чатове
- ✅ Restore функционалност
- ✅ Permanent delete

### ✅ Prompts (`/prompts`)
- ✅ Prompt Manager
- ✅ Създаване и управление на prompts
- ✅ Color markers за prompts

### ✅ Profile (`/profile`)
- ✅ Account информация
- ✅ Change password (с strength indicator и validation)
- ✅ Sign out

### ✅ Settings (`/settings`)
- ✅ Theme настройки (Light/Dark/System)
- ❌ Avatar upload (PRO feature)
- ✅ Export/Import данни (JSON и Markdown, с валидация и конфликт обработка)
- ✅ Account deletion (с confirmation modal "DELETE")

### ✅ Folders (в Sidebar)
- ✅ Списък с всички папки
- ✅ Създаване на нови папки
- ⚠️ Редактиране на папки (има бутон, но не е функционален)
- ✅ Изтриване на папки
- ✅ Color coding за папки

### ✅ Chat Studio (`/studio`)
- ✅ Директно чатиране с AI платформи
- ✅ AI selector dropdown (Gemini, GPT-4o, Claude)
- ✅ Chat interface с messages
- ✅ Save Chat функционалност
- ⚠️ PRO feature gate (има, но не е пълно интегриран)

---

## 💬 Chat Функционалности

### ✅ Създаване на Chat
- ✅ **New Chat** бутон (Dashboard)
- ✅ **CreateChatModal** с полета:
  - ✅ Title (задължително)
  - ✅ Chat URL (опционално)
  - ✅ Folder (dropdown - опционално)
  - ✅ Platform (ChatGPT, Claude, Gemini, Other)
  - ❌ AI generate button (PRO feature - скрит за не-PRO)

### ✅ Chat Card Опции
- ✅ **Edit** - Редактиране на chat (title, URL, folder, platform)
- ✅ **Archive** - Архивиране на chat
- ✅ **Restore** - Възстановяване от архив
- ✅ **Delete** - Изтриване на chat
- ✅ **Move to Folder** (има drag & drop)
- ⚠️ **Generate Summary** (PRO feature - има функционалност, но не е скрит за не-PRO)
- ⚠️ **Extract Tasks** (PRO feature - има функционалност, но не е скрит за не-PRO)
- ✅ **Open Chat** - Отваряне на source URL в нов tab

### ✅ Chat Информация
- ✅ Platform badge (ChatGPT, Claude, Gemini, Other)
- ✅ Title с link към source URL
- ✅ Summary (markdown rendering)
- ✅ Tasks list (ако има)
- ✅ Created date (relative или absolute format)

---

## 📁 Folder Функционалности

### ✅ Създаване на Folder
- ✅ **+** бутон до "Folders" в Sidebar
- ✅ **CreateFolderModal** с:
  - ✅ Name (задължително)
  - ✅ Color picker (опционално)
  - ✅ Icon picker

### ⚠️ Folder Опции
- ⚠️ **Edit** - Редактиране на име и цвят (има бутон, но не е функционален)
- ✅ **Delete** - Изтриване на папка (и всички чатове в нея)
- ✅ **View** - Отваряне на страница с чатове в папката

### ✅ Folder Страница (`/folder/[id]`)
- ✅ Показва всички чатове в папката
- ✅ Delete Folder бутон
- ✅ Back to Dashboard link

---

## 🔍 Search & Filter Функционалности

### ✅ Search Bar
- ✅ Real-time търсене по title, summary, platform (в Chats page)
- ✅ Instant results (без натискане на Enter)
- ✅ Clear search бутон

### ✅ Search Filters (в Chats page)
- ✅ **Platform Filter:**
  - ✅ ChatGPT
  - ✅ Claude
  - ✅ Gemini
  - ✅ Other
  - ✅ All (default)

- ✅ **Folder Filter:**
  - ✅ All Folders
  - ✅ No Folder (Uncategorized)
  - ✅ Конкретна папка

- ✅ **Date Range Filter:**
  - ✅ Date From
  - ✅ Date To
  - ✅ Clear filters бутон

---

## 📤 Export & Import

### ✅ Export Опции
- ✅ **Export as JSON** - Експорт на всички чатове и папки като JSON backup
- ✅ **Export as Markdown** - Експорт на всички чатове като Markdown файл
- ✅ Доступни от Settings страница

### ✅ Import Опции
- ✅ **Import from JSON** - Импорт на чатове и папки от JSON backup
- ✅ Доступни от Settings страница
- ✅ Валидация на JSON структура
- ✅ Обработка на конфликти (дублирани записи с confirmation)

---

## 🤖 AI Функционалности (PRO Feature)

### ⚠️ Generate Summary
- ✅ Автоматично генериране на резюме на чат
- ✅ Използва Gemini API
- ✅ Показва се в ChatCard като summary
- ✅ Markdown rendering
- ❌ Скрит за не-PRO потребители

### ⚠️ Extract Tasks
- ✅ Автоматично извличане на задачи от чат
- ✅ Използва Gemini API
- ✅ Показва се като tasks list в ChatCard
- ❌ Скрит за не-PRO потребители

### ❌ AI Generate (в CreateChatModal)
- ❌ Автоматично генериране на title и summary
- ❌ Използва Gemini API
- ❌ Скрит за не-PRO потребители

**Важно:** Всички AI функции трябва да са скрити за не-PRO потребители, но в момента не са.

---

## 🎨 UI & UX Функционалности

### ✅ Dark Mode
- ✅ **Light Mode** - Светла тема
- ✅ **Dark Mode** - Тъмна тема
- ✅ **System** - Следва system preferences
- ✅ Настройка от Settings страница

### ✅ Responsive Design
- ✅ **Desktop** - Пълен layout с sidebar
- ✅ **Tablet** - Адаптиран layout
- ✅ **Mobile** - Mobile-friendly с hamburger menu

### ✅ Drag & Drop
- ✅ Преместване на чатове между папки
- ✅ Визуална индикация при drag
- ✅ Drop zones за папки
- ✅ Преместване на папки в други папки

### ✅ Animations & Transitions
- ✅ Smooth transitions
- ✅ Hover effects
- ✅ Loading states
- ✅ Toast notifications

---

## 🔐 Authentication & Security

### ✅ Sign Up
- ✅ Email и password регистрация
- ✅ **Google OAuth регистрация**
- ✅ Password validation (8+ chars, uppercase, lowercase, number, special)
- ⚠️ Real-time password strength indicator (има, но не е пълен)

### ✅ Sign In
- ✅ Email и password вход
- ✅ **Google OAuth вход**
- ✅ Remember me функционалност
- ✅ Redirect след успешен вход

    ### ✅ Sign Out
    - ✅ Sign out от Profile страница
    - ✅ Clear session и redirect към auth

    ### ✅ Password Management
    - ✅ Change password от Profile страница
    - ✅ Password strength indicator (Weak/Medium/Strong)
    - ✅ Password validation (8+ chars, uppercase, lowercase, numbers, symbols)

    ### ✅ Account Deletion
    - ✅ Delete account от Settings страница
    - ✅ Confirmation modal (трябва да напишеш "DELETE")
    - ✅ Изтрива всички данни (chats, folders, prompts, images)

---

## 📱 PWA (Progressive Web App)

### ✅ Install Prompt
- ✅ Install prompt за desktop и mobile
- ✅ PWA manifest.json
- ✅ Service worker за offline support

### ⚠️ Offline Support
- ✅ Service worker caching
- ❌ Offline mode (планирано)

---

## 🌉 Chrome Extension

### ✅ One-Click Save
- ✅ Extension icon click → запазва чат
- ✅ Автоматично извличане на content
- ✅ Отваря `/save` страница с pre-filled данни

### ❌ Context Menu
- ❌ Right-click на ChatGPT/Claude/Gemini страница
- ❌ "Save to AI Chat Organizer" опция
- ❌ Автоматично извличане на content

### ✅ Content Extraction
- ✅ Multi-strategy extraction за ChatGPT
- ✅ Multi-strategy extraction за Claude
- ⚠️ Multi-strategy extraction за Gemini (partial - raw JSON)
- ✅ Fallback стратегии

### ✅ Platform Detection
- ✅ Автоматично детектиране на платформа
- ✅ Platform badge в запазените чатове

---

## 📝 Prompt Manager

### ✅ Създаване на Prompt
- ✅ **New Prompt** бутон
- ✅ **CreatePromptModal** с:
  - ✅ Name (задължително)
  - ✅ Content (задължително)
  - ✅ Color marker (опционално)

### ✅ Prompt Опции
- ✅ **Edit** - Редактиране на prompt
- ✅ **Delete** - Изтриване на prompt
- ✅ **Copy** - Копиране на prompt content

### ✅ Prompt List
- ✅ Grid layout с prompt cards
- ✅ Color markers за визуална организация
- ⚠️ Search функционалност (има в PromptsPage, но не е пълна)

---

## 🎯 Планирани Функционалности (Coming Soon)

### ✅ Google Authentication (T61)
- ✅ **Continue with Google** бутон в auth страницата
- ✅ Google OAuth integration
- ✅ Автоматична регистрация/логин с Google акаунт

### ✅ Chat Section (T62)
- ✅ **Нов раздел `/studio`** - Директно чатиране с AI
- ✅ AI selector dropdown (Gemini, GPT-4o, Claude)
- ✅ Chat interface с message history
- ✅ Save Chat функционалност
- ✅ Интеграция с Gemini API

### ✅ Images Feature (T48-T55)
- ✅ **Images раздел** - Отделен раздел за изображения
- ✅ **Image Folders** - Папки за изображения
- ⚠️ **Right-click Save** - Запазване на изображения от extension (не е имплементирано)
- ❌ **AVIF Conversion** - Автоматична конверсия в AVIF формат

### ✅ Dropdown Menu (T56-T57)
- ✅ **Три точки меню** - Dropdown меню в ChatCard
- ✅ **Move to Folder** - Преместване на чатове в папки (drag & drop)

### ❌ Extension Prompts (T58)
- ❌ **Right-click Insert Prompt** - Вмъкване на prompts в AI платформите
- ❌ **Prompts Popup** - Extension popup с prompts списък

### ❌ Extension Three Dots (T60)
- ❌ **Три точки в AI платформите** - Инжектиране в Gemini/ChatGPT/Claude
- ❌ **Add to AI Chat Organizer** - Dropdown меню опция

---

## 🔧 Технически Функционалности

### ✅ Error Handling
- ✅ Error boundaries
- ✅ Toast notifications за errors
- ⚠️ Sentry error tracking (production) - не е имплементиран

### ✅ Loading States
- ✅ Spinner компонент
- ✅ Skeleton loaders
- ✅ Loading indicators

### ✅ Notifications
- ✅ Toast notifications (Sonner)
- ✅ Success/Error/Info messages
- ✅ Auto-dismiss

### ✅ Data Validation
- ✅ Zod schemas за валидация
- ✅ Client-side validation
- ✅ Server-side validation

### ✅ Security
- ✅ RLS (Row Level Security) в Supabase
- ✅ Password validation
- ✅ File upload validation (magic bytes)
- ✅ XSS protection

---

## 📊 Статистики & Информация

### ✅ User Information
- ✅ Email
- ✅ Member since date
- ✅ Account creation date

### ✅ Chat Statistics
- ✅ Общ брой чатове
- ✅ Чатове по платформа
- ✅ Чатове по папка
- ✅ Archived чатове

---

## 🎨 Визуални Елементи

### ✅ Icons
- ✅ Material Symbols icons
- ✅ Lucide React icons
- ✅ Platform-specific icons

### ✅ Colors
- ✅ Primary color (blue)
- ✅ Folder colors (customizable)
- ✅ Platform badges (ChatGPT=green, Claude=orange, Gemini=blue, Other=gray)

### ✅ Glass Panel Design
- ✅ Glass morphism ефект
- ✅ Backdrop blur
- ✅ Border effects
- ✅ Shadow effects

---

## ⌨️ Keyboard Shortcuts

### ⚠️ Keyboard Shortcuts
- ✅ **Enter** в CreateChatModal → Submit
- ✅ **Escape** → Close modal
- ❌ **Arrow keys** в dropdowns (планирано)

---

## 📱 Mobile Опции

### ✅ Mobile Menu
- ✅ Hamburger menu button
- ✅ Slide-in sidebar
- ✅ Touch-friendly buttons
- ✅ Responsive modals

---

## 🔄 Real-time Updates

### ✅ Auto-refresh
- ✅ Автоматично обновяване на данни
- ⚠️ Real-time search (има в някои страници)
- ⚠️ Instant filter results (има в някои страници)

---

## 🎁 PRO Features (Скрити за не-PRO)

### ⚠️ PRO Features Visibility
- ⚠️ **Generate Summary** бутон (има функционалност, но не е скрит)
- ⚠️ **Extract Tasks** бутон (има функционалност, но не е скрит)
- ❌ **AI Generate** бутон в CreateChatModal
- ❌ **Avatar Upload** (планирано)

---

## 📚 Референции

- ✅ `README.md` - Основна документация
- ✅ `TESTING.md` - Testing guide
- ✅ `docs/` - Детайлна документация
- ✅ `src/app/` - Страници
- ✅ `src/components/features/` - Компоненти

---

## 📈 Статистика

**Общо функционалности:** ~150  
**Готови:** ~110 (73%)  
**Частично готови:** ~20 (13%)  
**Не готови:** ~20 (13%)

---

## 🎯 Приоритети за Довършване

### Висок Приоритет
1. ✅ Profile страница (Sign out, Change password, Account info)
2. ❌ PRO features visibility (скриване на AI функции за не-PRO)
3. ✅ Search & Filter функционалности (Platform, Folder, Date Range) - в Chats page
4. ✅ Account deletion функционалност
5. ✅ Export/Import UI интеграция

### Среден Приоритет
6. ⚠️ Folder Edit функционалност
7. ✅ Chat Statistics
8. ✅ User Information display
9. ❌ Extension Context Menu
10. ❌ Extension Prompts integration

### Нисък Приоритет
11. ❌ AVIF Conversion
12. ❌ Extension Three Dots
13. ❌ Sentry error tracking
14. ❌ Offline mode
15. ❌ Arrow keys в dropdowns

