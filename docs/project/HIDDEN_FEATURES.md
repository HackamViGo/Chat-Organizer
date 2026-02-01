# 🔒 Скрити Features (Готови за Активация)

Този документ съдържа списък на функционалности, които са напълно имплементирани, но са временно скрити от UI. Могат да бъдат активирани лесно чрез премахване на коментари.

---

## 📱 Popup UI Features

### 1. Download Actions
**Файл:** `apps/extension/src/popup/components/Actions.tsx`

**Как да активираш:**
Премахни коментарите около lines 21-31:

```tsx
{/* TODO: Enable when ready - Download Section */}
{/* <div className="flex items-center gap-2">
  <button className="flex-1 bg-slate-800/50 text-slate-300 text-sm py-2 rounded-lg border border-slate-700/50 hover:bg-slate-800/70 transition-colors flex items-center justify-center gap-1">
    <span>💾</span>
    <span>Download Selection</span>
  </button>
  <select className="bg-slate-800/50 text-slate-300 text-sm py-2 px-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/70 transition-colors cursor-pointer">
    <option>.md</option>
    <option>.txt</option>
    <option>.json</option>
  </select>
</div> */}
```

**Функционалност:**
- Бутон за download на селектиран текст/чат
- Dropdown за избор на формат (.md, .txt, .json)
- Стилизиран със slate-800 background

**Статус:** UI готов, логика за download трябва да се имплементира

---

### 2. Batch Pictures
**Файл:** `apps/extension/src/popup/components/Actions.tsx`

**Как да активираш:**
Премахни коментарите около lines 34-38:

```tsx
{/* TODO: Enable when ready - Batch Pictures */}
{/* <button className="w-full text-slate-400 hover:text-slate-300 text-sm py-2 rounded-lg border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 flex items-center justify-center gap-2">
  <span>🖼️</span>
  <span>Batch Pictures</span>
</button> */}
```

**Функционалност:**
- Ghost button стил (transparent background)
- Batch download на изображения от чатове
- Hover effect с border highlight

**Статус:** UI готов, логика за batch download трябва да се имплементира

---

## 🎨 Theme Features

### 3. Light Mode
**Файлове:**
- `apps/extension/tailwind.config.ts` - `darkMode: 'class'` конфигуриран ✅
- `apps/extension/src/popup/hooks/useTheme.ts` - Theme toggle hook ✅
- `apps/extension/src/popup/components/Header.tsx` - Theme toggle button ✅

**Какво липсва:**
Всички компоненти използват hardcoded dark colors. Трябва да се добавят `dark:` variants:

**Пример:**
```tsx
// Сега:
className="bg-slate-800/30 text-slate-300"

// Трябва да стане:
className="bg-white dark:bg-slate-800/30 text-slate-900 dark:text-slate-300"
```

**Компоненти за update:**
- `StatusBar.tsx`
- `ModulesPanel.tsx`
- `QuickAccess.tsx`
- `Actions.tsx`
- `Footer.tsx`
- `CurrentChat.tsx`
- `Header.tsx`

**Статус:** Инфраструктура готова, CSS variants липсват

---

## 🔧 Backend Features

### 4. Module Toggles (Backend Handler)
**Файл:** `apps/extension/src/background/service-worker.js`

**Какво е готово:**
- Popup изпраща `updateModuleState` message ✅
- State се запазва в `chrome.storage.local` ✅

**Какво липсва:**
Handler в service-worker.js за:
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateModuleState') {
    const { modules } = message;
    
    // Disable/Enable context menu items based on modules state
    if (!modules.chats) {
      // Disable "Save Chat" menu item
      chrome.contextMenus.update('save-chat', { enabled: false });
    }
    
    if (!modules.prompts) {
      // Disable "Inject Prompt" and "Create Prompt" menu items
      chrome.contextMenus.update('inject-prompt', { enabled: false });
      chrome.contextMenus.update('create-prompt', { enabled: false });
    }
  }
});
```

**Статус:** UI готов, backend handler липсва

---

## 📝 Бележки

- Всички скрити features са стилизирани и готови за production
- Премахването на коментари е достатъчно за активация на UI
- Backend логика трябва да се имплементира за пълна функционалност
- Light mode изисква систематично добавяне на dark: variants

**Последна актуализация:** 2026-02-01
