# 🗄️ СТРУКТУРА НА ПРОЕКТА - Next.js 14 Clean Architecture

## ✅ ФИНАЛНА СТРУКТУРА:

```
mega-pack/
├── public/                      # Static assets
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/
│   │   │   ├── ai/generate/route.ts
│   │   │   ├── export/route.ts
│   │   │   ├── import/route.ts
│   │   │   └── upload/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/              # Sidebar
│   │   └── features/            # Feature components
│   │       ├── chats/
│   │       ├── brain/
│   │       ├── images/
│   │       └── lists/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── services/
│   │   │   └── ai.ts
│   │   ├── validation/
│   │   └── utils/
│   ├── store/                   # Zustand
│   │   ├── useChatStore.ts
│   │   ├── useFolderStore.ts
│   │   └── usePromptStore.ts
│   └── types/
│       ├── database.types.ts
│       └── index.ts
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## ТЕКУЩА VITE СТРУКТУРА:
```
mega-pack/
├── components/          # React компоненти
│   ├── ChatCard.tsx
│   ├── ChatStudio.tsx
│   ├── GlobalBrain.tsx
│   ├── ImagesPage.tsx
│   ├── ListsPage.tsx
│   └── Sidebar.tsx
├── services/           # Бизнес логика
│   └── geminiService.ts
├── store/              # State management
│   └── counterStore.js
├── store.tsx           # Store setup
├── types.ts            # TypeScript types
├── pages/
│   └── index.js
└── public/
```

## NEXT.JS ЦЕЛЕВА СТРУКТУРА:
```
mega-pack/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   ├── ai/route.ts    # AI API
│   │   │   ├── export/route.ts
│   │   │   ├── import/route.ts
│   │   │   └── upload/route.ts
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/             # ← От Vite (запазват се)
│   │   ├── ChatCard.tsx
│   │   ├── ChatStudio.tsx
│   │   ├── GlobalBrain.tsx
│   │   ├── ImagesPage.tsx
│   │   ├── ListsPage.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── services/               # ← От Vite (разширява се)
│   │   ├── ai.ts              # geminiService мигриран
│   │   ├── chats.ts
│   │   ├── folders.ts
│   │   └── prompts.ts
│   │
│   ├── store/                  # ← Zustand (замества store.tsx)
│   │   ├── useChatStore.ts
│   │   ├── useFolderStore.ts
│   │   └── usePromptStore.ts
│   │
│   ├── types/                  # ← types.ts мигриран
│   │   ├── index.ts
│   │   └── database.types.ts
│   │
│   ├── lib/                    # Utilities
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── validation/
│   │   │   ├── chat.ts
│   │   │   ├── folder.ts
│   │   │   └── prompt.ts
│   │   └── utils/
│   │       └── cn.ts
│   │
│   └── hooks/
│       └── useAuth.ts
│
├── public/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
└── ...config files
```
├── docs/ # Документация (Спецификации, Roadmaps)
├── @rules/ # Правила за Агента (RULES.md, Progress.md)
├── .env.local # Променливи на средата
└── package.json # Зависимости
