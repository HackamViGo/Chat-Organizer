# Database Schema Documentation

Този документ описва пълната структура на базата данни за Chat Organizer приложението.

## Общ преглед

Базата данни използва PostgreSQL чрез Supabase и съдържа следните основни таблици:
- `users` - Потребители
- `chats` - Чатове от различни платформи
- `folders` - Папки за организиране на чатове, списъци, изображения и промптове (поддържа nested структура)
- `lists` - Списъци със задачи
- `list_items` - Елементи от списъци
- `images` - Изображения, запазени от чатове
- `prompts` - Промптове за използване в чатове (могат да се организират в папки)

## Таблици

### 1. `users`

Таблица за потребителите в системата. Свързана с Supabase Auth.

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор, свързан с `auth.users.id`
- `email` (TEXT, NOT NULL) - Имейл адрес на потребителя
- `full_name` (TEXT, NULLABLE) - Пълно име на потребителя
- `avatar_url` (TEXT, NULLABLE) - URL към аватар изображение
- `created_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на създаване
- `updated_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на последна актуализация

**Foreign Keys:**
- Няма (таблицата е root таблица)

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `email` (за бързо търсене)

**RLS Policies:**
- Потребителите могат да четат само собствените си данни
- Потребителите могат да актуализират само собствените си данни

---

### 2. `folders`

Таблица за папки, които се използват за организиране на чатове, списъци, изображения и промптове. Поддържа nested структура (подпапки).

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор
- `user_id` (UUID, NOT NULL) - Референция към потребителя собственик
- `name` (TEXT, NOT NULL) - Име на папката (макс. 100 символа)
- `type` (ENUM: `folder_type_enum`, NULLABLE) - Тип на папката: 'chat', 'list', 'image', 'prompt' или NULL за универсална
- `color` (TEXT, NULLABLE, DEFAULT '#6366f1') - Hex цвят на папката (формат: #RRGGBB)
- `icon` (TEXT, NULLABLE) - Икона на папката (идентификатор от FOLDER_ICONS)
- `parent_id` (UUID, NULLABLE) - Референция към родителска папка (за nested структура). NULL означава root папка
- `created_at` (TIMESTAMPTZ, NULLABLE, DEFAULT now()) - Дата и час на създаване
- `updated_at` (TIMESTAMPTZ, NULLABLE, DEFAULT now()) - Дата и час на последна актуализация

**Foreign Keys:**
- `folders_user_id_fkey` → `users.id` (ON DELETE CASCADE)
- `folders_parent_id_fkey` → `folders.id` (ON DELETE SET NULL) - Self-referencing за nested структура

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `user_id` (за бързо търсене по потребител)
- INDEX на `(user_id, type)` (за бързо търсене по потребител и тип)
- INDEX на `parent_id` (за бързо търсене на подпапки)

**RLS Policies:**
- Потребителите могат да четат само собствените си папки
- Потребителите могат да създават папки само за себе си
- Потребителите могат да актуализират само собствените си папки
- Потребителите могат да изтриват само собствените си папки

**Валидации:**
- `name`: минимум 1 символ, максимум 100 символа
- `color`: формат hex (#RRGGBB) ако е зададен
- `type`: едно от 'chat', 'list', 'image', 'prompt' или NULL
- `parent_id`: не може да сочи към собствената папка (circular reference prevention)

**Бележки:**
- Поддържа nested структура чрез `parent_id`
- При изтриване на родителска папка, `parent_id` на децата се задава на NULL (не се изтриват автоматично)

---

### 3. `chats`

Таблица за чатове, запазени от различни AI платформи (ChatGPT, Claude, Gemini).

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор
- `user_id` (UUID, NOT NULL) - Референция към потребителя собственик
- `title` (TEXT, NOT NULL) - Заглавие на чата (макс. 200 символа)
- `content` (TEXT, NULLABLE) - Пълното съдържание на чата (може да бъде много голямо)
- `platform` (TEXT, NULLABLE) - Платформата от която е чатът ('chatgpt', 'claude', 'gemini', 'other')
- `url` (TEXT, NULLABLE) - URL към оригиналния чат (ако е наличен)
- `summary` (TEXT, NULLABLE) - Кратко резюме на чата (генерирано от AI)
- `tasks` (JSONB, NULLABLE) - Извлечени задачи от чата (масив от обекти)
- `folder_id` (UUID, NULLABLE) - Референция към папка (ако чатът е в папка)
- `is_archived` (BOOLEAN, NULLABLE, DEFAULT false) - Дали чатът е архивиран
- `created_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на създаване
- `updated_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на последна актуализация

**Foreign Keys:**
- `chats_user_id_fkey` → `users.id` (ON DELETE CASCADE)
- `chats_folder_id_fkey` → `folders.id` (ON DELETE SET NULL)

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `user_id` (за бързо търсене по потребител)
- INDEX на `folder_id` (за бързо търсене по папка)
- INDEX на `(user_id, is_archived)` (за бързо търсене на активни/архивирани чатове)
- INDEX на `(user_id, platform)` (за бързо търсене по платформа)
- INDEX на `created_at` (за сортиране по дата)
- GIN INDEX на `tasks` (за бързо търсене в JSONB полето)

**RLS Policies:**
- Потребителите могат да четат само собствените си чатове
- Потребителите могат да създават чатове само за себе си
- Потребителите могат да актуализират само собствените си чатове
- Потребителите могат да изтриват само собствените си чатове

**Валидации:**
- `title`: минимум 1 символ, максимум 200 символа
- `url`: валиден URL формат (ако е зададен)
- `platform`: едно от 'chatgpt', 'claude', 'gemini', 'other'

---

### 4. `lists`

Таблица за списъци със задачи.

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор
- `user_id` (UUID, NOT NULL) - Референция към потребителя собственик
- `title` (TEXT, NOT NULL) - Заглавие на списъка (макс. 100 символа)
- `color` (TEXT, NULLABLE) - Цвят на списъка ('emerald', 'blue', 'purple', 'amber', 'rose', 'cyan')
- `folder_id` (UUID, NULLABLE) - Референция към папка (ако списъкът е в папка)
- `created_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на създаване
- `updated_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на последна актуализация

**Foreign Keys:**
- `lists_user_id_fkey` → `users.id` (ON DELETE CASCADE)
- `lists_folder_id_fkey` → `folders.id` (ON DELETE SET NULL)

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `user_id` (за бързо търсене по потребител)
- INDEX на `folder_id` (за бързо търсене по папка)
- INDEX на `created_at` (за сортиране по дата)

**RLS Policies:**
- Потребителите могат да четат само собствените си списъци
- Потребителите могат да създават списъци само за себе си
- Потребителите могат да актуализират само собствените си списъци
- Потребителите могат да изтриват само собствените си списъци

**Валидации:**
- `title`: минимум 1 символ, максимум 100 символа
- `color`: едно от 'emerald', 'blue', 'purple', 'amber', 'rose', 'cyan'

---

### 5. `list_items`

Таблица за елементите в списъците (задачите).

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор
- `list_id` (UUID, NOT NULL) - Референция към списъка
- `text` (TEXT, NOT NULL) - Текст на елемента (макс. 500 символа)
- `completed` (BOOLEAN, NULLABLE, DEFAULT false) - Дали елементът е завършен
- `position` (INTEGER, NULLABLE, DEFAULT 0) - Позиция на елемента в списъка (за сортиране)
- `created_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на създаване

**Foreign Keys:**
- `list_items_list_id_fkey` → `lists.id` (ON DELETE CASCADE)

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `list_id` (за бързо търсене по списък)
- INDEX на `(list_id, position)` (за сортиране по позиция в списъка)
- INDEX на `(list_id, completed)` (за бързо търсене на завършени/незавършени)

**RLS Policies:**
- Потребителите могат да четат елементи само от собствените си списъци
- Потребителите могат да създават елементи само в собствените си списъци
- Потребителите могат да актуализират елементи само в собствените си списъци
- Потребителите могат да изтриват елементи само от собствените си списъци

**Валидации:**
- `text`: минимум 1 символ, максимум 500 символа
- `position`: неотрицателно цяло число

---

### 6. `images`

Таблица за изображения, запазени от чатове.

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор
- `user_id` (UUID, NOT NULL) - Референция към потребителя собственик
- `url` (TEXT, NOT NULL) - URL към изображението (може да бъде data URL или external URL)
- `name` (TEXT, NULLABLE) - Име на изображението
- `path` (TEXT, NULLABLE) - Път към файла в storage (ако е запазено в Supabase Storage)
- `source_url` (TEXT, NULLABLE) - URL на оригиналното изображение (от чата)
- `mime_type` (TEXT, NULLABLE) - MIME тип на изображението (например 'image/png', 'image/jpeg')
- `size` (BIGINT, NULLABLE) - Размер на файла в байтове
- `folder_id` (UUID, NULLABLE) - Референция към папка (ако изображението е в папка)
- `created_at` (TIMESTAMPTZ, NULLABLE) - Дата и час на създаване

**Foreign Keys:**
- `images_user_id_fkey` → `users.id` (ON DELETE CASCADE)
- `images_folder_id_fkey` → `folders.id` (ON DELETE SET NULL)

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `user_id` (за бързо търсене по потребител)
- INDEX на `folder_id` (за бързо търсене по папка)
- INDEX на `created_at` (за сортиране по дата)
- INDEX на `mime_type` (за филтриране по тип)

**RLS Policies:**
- Потребителите могат да четат само собствените си изображения
- Потребителите могат да създават изображения само за себе си
- Потребителите могат да актуализират само собствените си изображения
- Потребителите могат да изтриват само собствените си изображения

**Валидации:**
- `url`: задължително поле, валиден URL формат
- `mime_type`: валиден MIME тип (ако е зададен)

---

### 7. `prompts`

Таблица за промптове, които потребителите могат да използват в чатове. Могат да се организират в папки.

**Колони:**
- `id` (UUID, PRIMARY KEY) - Уникален идентификатор
- `user_id` (UUID, NOT NULL) - Референция към потребителя собственик
- `title` (TEXT, NOT NULL) - Заглавие на промпта (макс. 200 символа)
- `content` (TEXT, NOT NULL) - Съдържание на промпта
- `color` (TEXT, NULLABLE, DEFAULT '#6366f1') - Hex цвят на промпта (формат: #RRGGBB)
- `use_in_context_menu` (BOOLEAN, NULLABLE, DEFAULT false) - Дали промптът да се показва в контекстното меню на разширението
- `folder_id` (UUID, NULLABLE) - Референция към папка (ако промптът е в папка)
- `created_at` (TIMESTAMPTZ, NULLABLE, DEFAULT now()) - Дата и час на създаване
- `updated_at` (TIMESTAMPTZ, NULLABLE, DEFAULT now()) - Дата и час на последна актуализация

**Foreign Keys:**
- `prompts_user_id_fkey` → `users.id` (ON DELETE CASCADE)
- `prompts_folder_id_fkey` → `folders.id` (ON DELETE SET NULL)

**Indexes:**
- PRIMARY KEY на `id`
- INDEX на `user_id` (за бързо търсене по потребител)
- INDEX на `(user_id, use_in_context_menu)` (за бързо търсене на промптове за контекстно меню)
- INDEX на `folder_id` (за бързо търсене по папка)
- INDEX на `created_at` (за сортиране по дата)

**RLS Policies:**
- Потребителите могат да четат само собствените си промптове
- Потребителите могат да създават промптове само за себе си
- Потребителите могат да актуализират само собствените си промптове
- Потребителите могат да изтриват само собствените си промптове

**Валидации:**
- `title`: минимум 1 символ, максимум 200 символа
- `content`: минимум 1 символ
- `color`: формат hex (#RRGGBB) ако е зададен

---

## Диаграма на връзките

```
users
  ├── folders (1:N)
  │     ├── parent_id → folders.id (N:1, nested structure)
  │     ├── chats (1:N)
  │     ├── lists (1:N)
  │     ├── images (1:N)
  │     └── prompts (1:N)
  ├── chats (1:N)
  ├── lists (1:N)
  │     └── list_items (1:N)
  ├── images (1:N)
  └── prompts (1:N)
```

## Row Level Security (RLS)

Всички таблици трябва да имат активиран RLS (Row Level Security) за да гарантират, че потребителите могат да достъпват само собствените си данни.

### Общи RLS Policies

За всяка таблица (освен `users`), трябва да има следните policies:

1. **SELECT Policy**: Потребителите могат да четат само редове където `user_id = auth.uid()`
2. **INSERT Policy**: Потребителите могат да вмъкват редове само с `user_id = auth.uid()`
3. **UPDATE Policy**: Потребителите могат да актуализират само редове където `user_id = auth.uid()`
4. **DELETE Policy**: Потребителите могат да изтриват само редове където `user_id = auth.uid()`

### Специални случаи

- **`list_items`**: Трябва да проверява дали `list_id` принадлежи на потребителя чрез JOIN с `lists` таблицата
- **`users`**: Може да има по-специфични policies в зависимост от изискванията за профили

## Индекси за производителност

### Препоръчани индекси

1. **Composite indexes за често използвани заявки:**
   - `chats(user_id, is_archived, created_at)` - за странициране на активни/архивирани чатове
   - `lists(user_id, created_at)` - за сортиране на списъци
   - `list_items(list_id, position)` - за сортиране на елементи

2. **GIN indexes за JSONB:**
   - `chats.tasks` - за бързо търсене в JSONB полето

3. **Partial indexes:**
   - `chats(user_id) WHERE is_archived = false` - за бързо търсене на активни чатове
   - `prompts(user_id) WHERE use_in_context_menu = true` - за бързо търсене на промптове за меню

## Constraints и валидации

### Database Constraints

- Всички `id` полета са UUID и PRIMARY KEY
- Всички `user_id` полета са NOT NULL и FOREIGN KEY към `users.id`
- `chats.title` и `lists.title` и `prompts.title` са NOT NULL
- `list_items.text` е NOT NULL

### Application-level валидации

Валидациите се извършват на ниво приложение чрез Zod schemas в `src/lib/validation/`:

- `chat.ts` - валидация на чатове
- `folder.ts` - валидация на папки
- `list.ts` - валидация на списъци и елементи
- `prompt.ts` - валидация на промптове

## Миграции

Миграциите трябва да се съхраняват в `supabase/migrations/` директорията и да следват формат:
- `YYYYMMDDHHMMSS_description.sql`

### Примерна структура на миграция

```sql
-- Create users table (ако не е създадена от Supabase Auth)
-- Create folders table
-- Create chats table
-- Create lists table
-- Create list_items table
-- Create images table
-- Create prompts table

-- Add foreign keys
-- Add indexes
-- Enable RLS
-- Create RLS policies
```

## Storage Buckets

Ако се използва Supabase Storage за изображения, трябва да има bucket:
- `images` - за запазване на изображения от чатове
  - Public: false (достъп само чрез RLS)
  - File size limit: 10MB (или по избор)
  - Allowed MIME types: image/*

## Triggers

### Автоматично актуализиране на `updated_at`

Всички таблици с `updated_at` поле трябва да имат trigger, който автоматично актуализира полето при UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Приложи за всяка таблица:
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Бележки

- Всички UUID полета използват `gen_random_uuid()` за генериране на стойности по подразбиране
- Всички timestamp полета използват `NOW()` за стойности по подразбиране
- JSONB полето `chats.tasks` може да съдържа произволна структура, но препоръчително е да следва консистентен формат
- `images.url` може да бъде data URL (за малки изображения) или external URL (за големи файлове в storage)

