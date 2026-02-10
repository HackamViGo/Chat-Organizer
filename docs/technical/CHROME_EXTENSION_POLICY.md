# BrainBox Chrome Extension Policy (Manifest V3)

Този документ дефинира техническите политики, разрешения и сигурност за BrainBox Extension.

## 1. Конфигурация на Manifest V3

BrainBox използва Manifest V3, за да осигури максимална сигурност и производителност.

- **Background**: Използва Service Worker (`src/background/service-worker.ts`).
- **Action**: Дефиниран попъп (`src/popup/index.html`).
- **Scripting**: Използва инжектиране на контент скриптове за AI платформи.

## 2. Декларирани Permissions

Разширението изисква минимален набор от права:

- **`storage`**: За съхранение на сесийни токени, настройки и локален кеш (IndexedDB).
- **`tabs`**: За комуникация между табовете и идентифициране на активната AI платформа.
- **`contextMenus`**: За инжектиране на промпти директно чрез десен бутон в текстови полета.
- **`webRequest`**: За пасивно прихващане на сесийни токени (Non-blocking Token Extraction). Ключово за синхронизацията без Content Script Injection.

## 3. Host Permissions

BrainBox има достъп само до оторизирани AI платформи и собствения си Dashboard:

- `https://gemini.google.com/*`
- `https://chatgpt.com/*`
- `https://claude.ai/*`
- `https://*.deepseek.com/*`
- `https://*.perplexity.ai/*`
- `https://x.com/i/grok/*`
- `https://*.qwenlm.ai/*`
- `__DASHBOARD_URL__/*` (динамично се подменя по време на билд)

## 4. Content Security Policy (CSP)

Стриктна политика за предотвратяване на XSS и неразрешено изпълнение на код:

- **Extension Pages**: `script-src 'self'; object-src 'self';`
- **Sandbox**: Не се използва sandbox за изпълнение на отдалечен код.

> [!IMPORTANT]
> По време на производствения билд (`isProd`), `vite.config.ts` автоматично изчиства CSP от всякакви препратки към `localhost` или `127.0.0.1` за по-висока сигурност.

## 5. Сигурност на данните

- **No Remote Code**: Всички скриптове са пакетирани локално. Няма използване на `eval()` или `new Function()`.
- **Token Protection**: Сесийните токени се прехвърлят чрез защитенブリッジ (`content-dashboard-auth.ts`) и се съхраняват в `chrome.storage.local`.
- **Hardening**: Всички производствени активи се сканират и "втвърдяват" (scrubbing) за премахване на развойни метаданни.

## 6. Източници
- [Chrome Extension Permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
- [Security in MV3](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/#security-improvements)
