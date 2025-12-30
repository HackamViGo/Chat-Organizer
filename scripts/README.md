# API Test Script

Скрипт за автоматично тестване на всички API endpoints на BrainBox.

## Използване

### Основна команда

```bash
npm run test:api
```

### С custom настройки

```bash
# Custom base URL
API_BASE_URL=http://localhost:3000 npm run test:api

# С тестови credentials
TEST_EMAIL=test@example.com TEST_PASSWORD=test123 npm run test:api

# Комбинирано
API_BASE_URL=https://brainbox-alpha.vercel.app \
TEST_EMAIL=user@example.com \
TEST_PASSWORD=password123 \
npm run test:api
```

## Environment Variables

- `API_BASE_URL` - Base URL на API (default: `http://localhost:3000`)
- `TEST_EMAIL` - Email за тестване (default: `test@example.com`)
- `TEST_PASSWORD` - Парола за тестване (default: `testpassword123`)

## Тествани Endpoints

### Authentication
- `OPTIONS /api/auth/refresh`
- `POST /api/auth/refresh`

### Folders
- `OPTIONS /api/folders`
- `GET /api/folders`
- `POST /api/folders`
- `PUT /api/folders`
- `DELETE /api/folders`

### Chats
- `GET /api/chats`
- `POST /api/chats`
- `GET /api/chats/extension`

### Prompts
- `GET /api/prompts`
- `GET /api/prompts?use_in_context_menu=true`
- `POST /api/prompts/search`
- `GET /api/prompts/categories`
- `GET /api/prompts/by-category`
- `GET /api/prompts/proxy-csv`
- `POST /api/prompts`
- `PUT /api/prompts`
- `DELETE /api/prompts`

### Images
- `OPTIONS /api/images`
- `GET /api/images`
- `POST /api/images`

### Stats
- `OPTIONS /api/stats`
- `GET /api/stats`

### Export/Import
- `GET /api/export`
- `POST /api/import`

### Account
- `DELETE /api/account/delete` (skipped by default)

### AI
- `POST /api/ai/generate`
- `POST /api/ai/enhance-prompt`

### Proxy
- `GET /api/proxy-image`

### Upload
- `POST /api/upload`

## Резултати

Скриптът показва:
- ✅ Успешни тестове (зелено)
- ❌ Неуспешни тестове (червено)
- ⏭ Пропуснати тестове (жълто)

В края се показва обобщение с брой успешни/неуспешни/пропуснати тестове.

## Бележки

- Скриптът се опитва да се автентикира автоматично
- Някои тестове изискват автентикация и ще бъдат пропуснати ако няма auth
- `DELETE /api/account/delete` е пропуснат по подразбиране (изтрива акаунта!)
- Скриптът използва `fetch` API (Node.js 18+)

