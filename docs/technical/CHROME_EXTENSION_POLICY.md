
# Manifest V3 – permissions, CSP и специфики

Документът обобщава основните изисквания и особености на Manifest V3 за Chrome extensions – структури на permissions, Content Security Policy и ключови промени спрямо Manifest V2.

## 1. Основни промени в Manifest V3

- `manifest_version` трябва да бъде 3.  
- Background страниците са заменени със service workers (background service workers).  
- Забранен е „remotely hosted code“ – всички изпълними JS файлове трябва да са пакетирани в разширението.  
- Модифицирането на заявки минава през `declarativeNetRequest` вместо blocking listeners в `webRequest`.  
- Content Security Policy е затегната и не позволява изпълнение на произволни стрингове и inline скриптове в разширението.

Примерни минимални полета в `manifest.json` за MV3:

```json
{
  "manifest_version": 3,
  "name": "Example Extension",
  "version": "1.0.0",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

## 2. Категории permissions в Manifest V3

Chrome разделя permissions на няколко категории, декларирани в различни полета на manifest.json. 

### 2.1. Поле `permissions`

Полето `permissions` съдържа списък от „известни“ string‑ове за API‑та и специални права.

Примери за често използвани permissions:

- `"storage"` – достъп до `chrome.storage`.  
- `"tabs"` – достъп до привилегировани полета на `Tab` обекти.  
- `"activeTab"` – временен достъп до активния таб след потребителско действие.  
- `"scripting"` – изпълнение на скриптове в страници чрез `chrome.scripting`.  
- `"contextMenus"` – създаване на контекстни менюта.  
- `"notifications"` – показване на нотификации.  
- `"declarativeNetRequest"` – използване на Declarative Net Request API.  

Пример:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting",
    "declarativeNetRequest"
  ]
}
```

### 2.2. Поле `optional_permissions`

`optional_permissions` се заявяват, но се дават от потребителя в runtime.

### 2.3. Полета за host permissions

За достъп до конкретни хостове се ползват: 

host_permissions – задължителни host permissions.

optional_host_permissions – допълнителни host permissions, заявявани динамично.

Пример:

'''
{
  "host_permissions": [
    "https://www.developer.chrome.com/*"
  ],
  "optional_host_permissions": [
    "http://*/*",
    "https://*/*"
  ]
}
'''

## 3. Списък с често използвани Manifest V3 permissions (извадка)

Официалната и пълна листа с permissions се поддържа от Chrome. 

"activeTab" – временен достъп до текущия таб след user gesture.

"alarms" – създаване на scheduled задачи.

"bookmarks" – достъп и управление на отметки.

"browsingData" – изчистване на различни типове browsing данни.

"commands" – keyboard shortcuts за разширението.

"contentSettings" – промяна на content settings (cookies, images и др.).

"contextMenus" – добавяне на елементи в контекстното меню.

"cookies" – четене и запис на бисквитки за разрешени хостове.

"declarativeNetRequest" – филтриране и промяна на заявки чрез правила.

"downloads" – управление на сваляния.

"history" – достъп до browsing history.

"notifications" – показване на системни нотификации.

"scripting" – инжектиране на JS/CSS чрез chrome.scripting.

"storage" – използване на chrome.storage.

"tabs" – достъп до табовете и техните свойства.

"topSites" – четене на най‑посещаваните сайтове.

"webNavigation" – наблюдение на навигационни събития.



## 4. Content Security Policy (CSP) в Manifest V3

Manifest V3 използва по‑строга Content Security Policy за разширенията. 

Минимална препоръчителна политика за extension pages: 

'''
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self';"
  }
}
'''

Ключови моменти: 

Директива script-src 'self' – само скриптове от самото разширение.

Забранени са inline скриптове и eval() в extension страниците.

Не е разрешен „remotely hosted code" (remote JS файлове). 

## 5. Специфики и добри практики

Минимизирай исканите permissions. 

Използвай optional_permissions за допълнителни функционалности. 

Премини към declarativeNetRequest за мрежови промени. 

## 6. Официални източници (актуални към 2026)

Manifest V3 overview: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 

Migration guide: https://developer.chrome.com/docs/extensions/develop/migrate 

Permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions 

CSP: https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy 
