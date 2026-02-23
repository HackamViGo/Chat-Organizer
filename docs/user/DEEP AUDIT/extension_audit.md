# BrainBox - Extension Deep Audit

## §1 Manifest V3 & Build Security

**Build Pipeline (Vite 7.3.1)**
- **Plugins**: Използва се `@crxjs/vite-plugin`, който приема директно JSON обекта от `manifest.json`. Този плъгин е критичен за Manifest V3 разработка, тъй като автоматично парсва манифеста, генерира нужните assets, и включва HMR за extension средата.
- **Build Targets & OutDir**: Изходната директория е `dist`, която се изчиства преди всеки билд (`emptyOutDir: true`).
- **Sourcemaps**: Генерират се само в development режим (`process.env.NODE_ENV === 'development'`).
- **Chunk Strategy**: Rollup е конфигуриран да приема `src/popup/index.html` като изрична входна точка. CRXJS плъгинът автоматично намира останалите входни точки (background worker, content scripts) от подадения манифест. Разрешават се workspace aliases (`@brainbox/shared`).
- **stripDevCSP & Production Hardening**: Според архитектурните изисквания, `stripDevCSP` (често custom Vite plugin) автоматично премахва `localhost` референции в production билд. Той анализира манифеста по време на bundle генерацията и изтрива от `content_security_policy.extension_pages` стрингове като `http://localhost:*` и `ws://localhost:*`. В текущия файл `vite.config.ts` това правило не е явно внедрено като Vite plugin, което представлява потенциален anomaly risk за ръчно добавяне при build.

**Manifest.json & Security**
- **Permissions**: `storage` (local queue/tokens), `webRequest` (API interception), `cookies` (session), `contextMenus`, `notifications`, `tabs`, `scripting`, `activeTab`. Всички те са оправдани спрямо нуждите на разширението (виж Section 2 и 3).
- **Host Permissions**: Изчерпателен списък от AI платформи: OpenAI, Anthropic, Google Gemini, DeepSeek, Perplexity, Qwen, X/Grok, LMArena, както и `<all_urls>` за глобалния `prompt-inject.js`.
- **Content Security Policy**:
  - `extension_pages`: Дефинирано като `script-src 'self'; object-src 'self'; connect-src 'self' ...`. Към момента съдържа development домейни (`ws://localhost:5173`, `http://localhost:3000`) и production endpoints (`brainbox-alpha.vercel.app`, всички AI API-та). Наличието на излишни localhost домейни в продакшън манифеста би довело до rejection в Chrome Web Store.
- **Isolations**: Gemini изисква инжектиране в main world, поради което `src/content/inject-gemini-main.js` е дефиниран в `web_accessible_resources`.


## §2 Service Worker & Modules

**Service Worker Lifecycle (`service-worker.ts`)**
- **Initialization**: Инициализира основните мениджъри (`AuthManager`, `PromptSyncManager`, `DynamicMenus`, `NetworkObserver`, `InstallationManager`, `SyncManager`, `MessageRouter`) при стартиране.
- **Listeners**: Няма директни `install`/`activate` listeners в самия `service-worker.ts`. Те са изнесени в `InstallationManager`.
- **Bootstrapping**: При стартиране извлича `accessToken` от `chrome.storage.local` и подава към `SyncManager.initialize(accessToken)` за обработка на опашката. Запазва API/Dashboard конфигурационни флагове в локалния storage.

**Background Modules (`src/background/modules/`)**

- **`messageRouter.ts`**:
  - Routing Table:
    - Auth: `setAuthToken`, `checkDashboardSession`, `syncAll`.
    - Prompts: `fetchPrompts`, `syncPrompts`.
    - Gemini: `injectGeminiMainScript` (MAIN world injection), `storeGeminiToken`.
    - Folders: `getUserFolders`.
    - Conversations: `getConversation`, `saveToDashboard`.
    - Misc: `openLoginPage`.

- **`authManager.ts`**:
  - **Listeners**: Залага `chrome.webRequest` (предимно `onBeforeSendHeaders` и `onBeforeRequest`) за множество AI платформи: ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Grok, Qwen.
  - **Storage**: Запазва прихванати токени (напр. `chatgpt_token`, `claude_org_id`, `deepseek_token`, `grok_csrf_token`) в `chrome.storage.local`.
  - **JWT Lifecycle**: Методът `syncAll()` осъществява ping (GET `/api/folders`) към Dashboard с текущия `accessToken`. При `401 Unauthorized` токенът се счита за мъртъв и се изтрива от storage. Няма изрична автоматична логика за background refresh чрез refresh_token — разчита се на претърпяване на fail и повторен логин.

- **`syncManager.ts`**:
  - **Storage Queue**: Опашка (`brainbox_sync_queue`) в `chrome.storage.local`.
  - **Retry & Backoff**: Добавя елементи с `retries: 0`. При `processQueue`, неуспешен опит (върнато false) инкрементира `retries`. При `retries > 5`, елементът се премахва от опашката (dropping). Алгоритъмът използва линеен retry лимит, без експоненциален backoff.

- **`dashboardApi.ts`**:
  - **Error Handling**: Прилича на interceptor схема, но е имплементирано директно. Пригрешка `401` от Dashboard API се чисти `accessToken` и се отваря логин страница.
  - **Offline/Retry**: При мрежова грешка (fetch error) или сървърна грешка (5xx HTTP status), заявката автоматично се пренасочва към `SyncManager.addToQueue`.
  - Отговаря за локалното генериране на интелигентни тагове (`getOptimizedTags`) чрез стемър и whitelist базиран алгоритъм.

- **`cacheManager.ts`**:
  - Работи изцяло с `chrome.storage.local` (категорично НЕ използва IndexedDB). Ключове: `brainbox_folders_cache`, `brainbox_user_settings_cache`, `brainbox_last_sync_timestamp`. Използва се за Stale-While-Revalidate оптимизации.

- **`networkObserver.ts`** & **`tabManager.ts`**:
  - `tabManager`: Слуша `chrome.tabs.onUpdated` (`status === 'complete'`) за инициализация на платформи като Gemini.
  - `networkObserver`: Хваща HTTP заявки към `/api/organizations/*` за Claude, които не могат лесно да се хванат от content скрипт.

- **`installationManager.ts`**:
  - При `onInstalled` с `reason === 'install'` пренасочва потребителя към Dashboard логин екран (или начало, ако има сесия). Има заготовки за миграции при `update`.

- **`dynamicMenus.ts`**:
  - Построява контекстно меню с възможности за записване на чат (само на разрешени платформи), създаване на промпт, подобряване на текст с AI (`enhancePrompt`) и инжектиране. Динамично каскадира от потребителските папки и 7-те най-нови "Quick" промпта.

## §3 Network Interception & IndexedDB

**Network Interception (`brainbox_master.js`)**
- Този скрипт действа като Master Coordinator, инжектиран в `gemini.google.com` (според манифеста) на етап `document_start`.
- **XHR Monkey-Patch Strategy**:
  - Презаписва `XMLHttpRequest.prototype.open` и `send`.
  - Записва URL-а в `this._brainbox_url`. При извикване на `send()`, ако URL-ът съдържа целеви ключови думи (като `batchexecute`, `chat_session/get_session`, `chat/completion`, `grok/`, `api/predict`, `qwen`), се клонира request тялото и се извиква локална функция `captureRequestData` неблокиращо.
  - Добавя `addEventListener('load')` към XHR заявката за прихващане на `responseText` при успешен отговор (non-blocking `captureResponseData`).
- **Fetch API Override Strategy**:
  - Презаписва глобалния `window.fetch`.
  - Прихваща заявки към същите endpoints. Извлича тялото на заявката (`options.body`) и го праща към `captureRequestData`.
  - Изпълнява оригиналния fetch, прави **клонинг** на response (`response.clone()`) и чете текста `await clone.text()` във фонова async функция, връщайки оригиналния response веднага към приложението, за да не го блокира.
- **RELEVANT_API_REGEX & Endpoints**: Въпреки че в `SYNC_PROTOCOL.md` е дефиниран `RELEVANT_API_REGEX`, `brainbox_master.js` използва директни `includes()` проверки (напр. `batchexecute`, `deepseek.com`, `x.com/i/api`, `perplexity.ai`, `qwenlm.ai`). Точният `RELEVANT_API_REGEX` (според протокола) е `/((chatgpt\.com\/backend-api\/conversation|claude\.ai\/api\/organizations\/[^\/]+\/chat_conversations|gemini\.google\.com\/_\/GeminiWebGuiUi\/data\/batchexecute|chat\.deepseek\.com\/api\/v0\/chat\/history|perplexity\.ai\/api\/v1\/search|x\.com\/i\/api\/|grok\.com\/api\/|chat\.qwenlm\.ai\/api\/|chat\.lmsys\.org\/run\/predict))/i`.

**IndexedDB (`BrainBoxGeminiMaster`)**
Структурата на базата:
- **Database Name**: `BrainBoxGeminiMaster`
- **Database Version**: `8`
- **Object Stores**:
  1. `rawBatchData` (KeyPath: `id`, AutoIncrement: `true` | Indexes: `timestamp`, `processed`) - Пази сурови HTTP отговори от `batchexecute`.
  2. `encryptionKeys` (KeyPath: `conversationId` | Indexes: `timestamp`) - Запазва потенциални криптиращи ключове, извлечени от заявките/отговорите.
  3. `conversations` (KeyPath: `conversationId` | Indexes: `timestamp`, `title`, `synced`) - Съхранява дешифрирани/структурирани чатове (декодираният JSON от `batchexecute`).
  4. `syncQueue` (KeyPath: `id`, AutoIncrement: `true` | Indexes: `conversationId`, `retries`) - Локална опашка за синхронизация (която вероятно дублира или работи съвместно със Storage Queue).
  5. `images` (KeyPath: `id`, AutoIncrement: `true` | Indexes: `url`, `timestamp`, `synced`, `source_url`) - Запазване на прихванати изображения преди синхронизация.

**Gemini Decryption & Full Flow**
1. **HTTP Output**: `batchexecute` връща JSON масив. `brainbox_master` извлича стринга от `[0][2]` (който съдържа вгнезден JSON) и се опитва рекурсивно да намери обекти с ID започващо с `c_` (conversations).
2. **Key Storage**: Търси ключове (regex за `key`, `apiKey`, `sessionKey`, `cipher`, или base64 стрингове) и ги запазва в `encryptionKeys`.
3. **Save**: Чатовете се декодират и запазват в `conversations` store и автоматично се добавят към `syncQueue`.

## §4 Content Scripts per Platform (`src/content/`)

Всички content скриптове служат като мост между потребителския интерфейс на съответния AI сайт и Service Worker-а.

**Пълна UI Интеграция (Tier 1)**
- **ChatGPT (`content-chatgpt.js`)**:
  - Изчаква зареждането на глобалната `BrainBoxUI` библиотека.
  - Използва `MutationObserver` (върху `<nav>` елемента или sidebar-а), за да инжектира кастъм бутони (Save, Folder) при hover върху `a[href^="/c/"]`.
  - Извиква `handleSave` или `handleFolderSelect`, които пращат `getConversation` + `saveToDashboard` към background script-а.
- **Claude (`content-claude.js`)**:
  - Сходна UI интеграция (бутони при hover на историите `a[href^="/chat/"]`). Използва `debounce` за observer-а.
  - **Proactive Org ID Detection**: Тъй като Claude изисква `organization_id` за API calls, скриптът агресивно се опитва да го извлече от: URL параметри, Pathname, React `__INITIAL_STATE__`, DOM линкове и Meta тагове. Запазва го в `chrome.storage.local`.

**Context Menu Only & DOM Scraping Fallback (Tier 2)**
Следните скриптове са олекотени. Не инжектират UI бутони, а слушат за `triggerSaveChat` от context менюто.
- **DeepSeek (`content-deepseek.js`)**: Вади ID от `/chat/([a-zA-Z0-9_-]+)`. Fallback: търси `.message-content`, `.ds-markdown`, `.text-content`.
- **Grok (`content-grok.js`)**: Вади ID от URLSearchParams (`id`, `conversation`, `convo`) или regex `/(?:chat|grok|c)/([a-zA-Z0-9-]+)`. Fallback: `main.innerText`.
- **Perplexity (`content-perplexity.js`)**: Вади ID (slug) от `/search/([a-zA-Z0-9_-]+)`. Fallback: Извлича `h1` (user) и `.prose` (assistant) за сглобяване на базов Q&A.
- **Qwen (`content-qwen.js`)**: Вади ID от `/(?:chat|c)/([a-zA-Z0-9_-]+)`. Fallback: `main.innerText`.
- **LMArena (`content-lmarena.js`)**: Вади ID от `/c/([a-zA-Z0-9-]+)` (или ползва `current_session`). Събира всички `.prose` елементи и ги маркира временно с роля `unknown`.

**MAIN World Injection (Gemini)**
- **`inject-gemini-main.ts` / `.js`**: Това е специален скрипт, деклариран в `manifest.json` като `web_accessible_resources`, който се инжектира директно в контекста на страницата (MAIN world, не ISOLATED).
- Неговата цел е да заобиколи изолацията на екстенжъна и да прочете вътрешните променливи на Google (напр. `window.WIZ_global_data?.SNlM0e`, `window.AF_initDataCallback`, `window._sc_at`), за да извлече необходимия токен за Gemini API заявките. Изпраща го към изолирания content script чрез `window.postMessage`.

## §5 Platform Adapters & Normalization Pipeline

Архитектурата използва **Factory Pattern** за управление на различните платформи. Всяка платформа има свой адаптер, който имплементира `IPlatformAdapter` (от `base.ts`), и свой нормализатор в `normalizers.ts`, който преобразува специфичния JSON формат в **Common Schema** (`Conversation`).

**Platform Adapters (`src/background/modules/platformAdapters/*`)**
- Всички адаптери наследяват `BasePlatformAdapter`, който предоставя помощни методи за достъп до токени от `chrome.storage.local`.
- Всички мрежови заявки в адаптерите преминават през `limiters` (`src/lib/rate-limiter.js`), предпазвайки от API throttling (например `limiters.chatgpt.schedule(...)`).
- **`chatgpt.adapter.ts`**: Използва `chatgpt_token` като `Authorization` хедър. Извиква `https://chatgpt.com/backend-api/conversation/${id}`. При `401 Unauthorized` трие токена.
- **`claude.adapter.ts`**: Използва `claude_org_id` в URL-а (`https://claude.ai/api/organizations/${claude_org_id}/chat_conversations/${id}`). Изисква `credentials: 'include'` за бисквитките.
- **`gemini.adapter.ts`**: Най-сложният адаптер. Използва `gemini_dynamic_key` и `gemini_at_token`. Формира двойно сериализиран payload (Gemini quirk): `[ [ [ key, JSON.stringify(["c_ID", 10, ...]), null, "generic" ] ] ]`. Парсва отговора след премахване на сигурностния префикс `)]}'\n`.
- Останалите адаптери следват сходен модел, използвайки сесийни идентификатори и съответните API endpoints.

**Normalization Pipeline (`src/lib/normalizers.ts`)**
Целта на нормализаторите е да превърнат хаотичните отговори в масив от `Message` (с роли `user`/`assistant`/`system`) под едно `Conversation`.
- **`normalizeChatGPT`**: Отговорът е *дървовидно свързан списък* (`mapping`). Нормализаторът започва от `current_node` и върви назад по `parent` референциите, за да възстанови линейната история на текущия клон (branch). Заобикаля алтернативните съобщения. Извлича модела в metadata.
- **`normalizeClaude`**: Директно map-ва `chat_messages` масива, превеждайки `sender: 'human'` към `ROLES.USER`. Запазва `attachments`.
- **`normalizeGemini`**: Извършва изключително агресивно извличане и филтриране поради липсата на официална структура:
  - Рекурсивно сканира масивите чрез `extractGeminiMessages()`.
  - Елиминира шумове (`isTechnicalData()`): отхвърля base64, ID-та (`rc_`, `c_`), системни команди (`data_analysis_tool`), кратки URL-и.
  - Евристично определяне на роля (`determineGeminiRoleImproved`): Тъй като не пише кой го е казал, разпознава `USER` по команди ("Направи", "Създай", "?") и `ASSISTANT` по маркетинг форматиране ("**", номерации, "Изображения").
- **Other Normalizers**: Прости маппери за Qwen, DeepSeek, Grok, Perplexity.
- Всички връщат обект, съвместим със Zod схемата `Conversation` (дефинирана в `src/lib/schemas.ts`).

## §6 Token Bridge Deep-Dive

**Проблемът (HTTP vs Extension Limits)**
Разширението има нужда от автентикация (Supabase JWT), за да комуникира със защитения Dashboard API. Background script-ът няма директен достъп до `localStorage` на уеб страниците (Dashboard-а) заради браузърната изолация при Manifest V3.

**Решението (`content-dashboard-auth.ts`)**
Този content скрипт се инжектира единствено в страниците на самия Dashboard (дефинирано в `manifest.json` чрез `matches` за production и localhost URLs на Dashboard-а). Той играе ролята на мост (Token Bridge) между `localStorage` на Dashboard-а и `chrome.storage.local` на екстенжъна.

**Механизми на синхронизация:**
1. **Initial Sync & Polling (Local Storage Read)**:
   - Търси ключ в `localStorage`, започващ с `sb-` и завършващ на `-auth-token`. Има fallback към специфично Prod ID (`biwiicspmrdecsebcdfp`) или `sb-localhost-auth-token`.
   - Чете `access_token`, `refresh_token`, `expires_at` и ги изпраща към background-а чрез `chrome.runtime.sendMessage({ action: 'SET_SESSION' })`.
   - Има setInterval на 5 секунди като polyfill/застраховка.
2. **Explicit Broadcasts (Window Messages)**:
   - Dashboard-ът може проактивно да прати съобщение към `window`.
   - Скриптът слуша за `message` събития (`BRAINBOX_TOKEN_TRANSFER`, `BRAINBOX_SESSION_SYNC`, `SYNC_SESSION_EXT`).
   - Има важна проверка за сигурност: `event.origin !== window.location.origin` се отхвърля, за да се предотврати XSS/Clickjacking кражба на сесия от други табове.
3. **Storage Event Listener**:
   - Слуша за `window.addEventListener('storage')`. Ако Supabase обнови токена в друг таб на Dashboard-а, скриптът веднага ще го прихване и прати към екстенжъна.
4. **Lazy Pull (Background to Content)**:
   - Слуша за `chrome.runtime.onMessage` с команда `GET_SESSION`. Ако background-ът загуби токена, може да го поиска активно от отворен Dashboard таб.

**Security Implications**: Токенът се прехвърля успешно, но се запазва в Plain Text в `chrome.storage.local` на екстенжъна (както бе установено в Audit 2). 

## §7 Exhaustive Element Dictionary

BrainBox разчита на следните CSS селектори за манипулация на DOM (UI инжектиране и scraping fallback). Всяка промяна от страна на платформите по тези класове може да счупи екстенжъна:

### ChatGPT
- **Sidebar Container**: `nav`, `[class*="sidebar"]`
- **History Link**: `a[href^="/c/"]`
- **Title Text**: `span.opacity-60`, `span.truncate span`, `div.truncate span`
- **Form Stabilization**: `form` (за отлагане на style injection)

### Claude
- **Sidebar Container**: `nav`, `[data-testid="sidebar-content"]`
- **History Link**: `a[href^="/chat/"]`
- **Org ID Detection**: `a[href*="/organizations/"]`, `meta[name="organization-id"]`

### Gemini (`brainbox_master.js`)
- **Chat History**: `#chat-history`
- **Conversation Blocks**: `.conversation-container`
- **Active Prompt Box**: `textarea:focus`
- **User Query**: `user-query .query-text`
- **Model Response**: `model-response`, `.model-response-text`
- **Session Titles**: `.conversation-title`, `[class*="conversation-title"]`
- **Pagination Tracker**: `.v-scroll-viewport`, `button[aria-label*="history"]`, `button[aria-label*="previous"]`

### Perplexity
- **Main Container**: `main`
- **Thread Title**: `h1`
- **User Queries**: `.font-display`
- **Model Answers**: `.prose`

### DeepSeek
- **Chat Container**: `.chat-container`, `main`
- **Message Content**: `.message-content`, `.ds-markdown`, `.text-content`

### Grok & Qwen
- **Container**: `main` (Fallback към `document.body.innerText`)

### LMysys Arena (LMArena)
- **Message Text**: `.prose`

*(Всички селектори са извлечени директно от AST / regex analysis на `src/content/*`)*
