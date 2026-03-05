<!-- doc: PAGE_ROUTE_MAP.md | version: 1.0 | last-updated: 2026-03-03 | author: DOCS_LIBRARIAN -->

# 📄 PAGE_ROUTE_MAP.md

## Dashboard Page and Layout Routes

### /

- **File:** apps/dashboard/src/app/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** ChatStatisticsCard, DailyPromptTipCard, DashboardMetrics, GPT5AlphaCard, NotificationsCard, RecentProjects, SystemStatusCard, UsageChart, UserInfoCard
- **Store init:** useChatStore, useFolderStore
- **Server queries:** supabase.auth.getUser()

### /lists

- **File:** apps/dashboard/src/app/lists/page.tsx
- **Rendering:** Server Component
- **Auth:** Required (currently commented out for local dev)
- **Top-level components:** ListsPage
- **Store init:** ⚠️ TODO: Initial lists passed as prop, store init happens in client component
- **Server queries:** `supabase.from('lists').select(...)` (currently commented out)

### /prompts

- **File:** apps/dashboard/src/app/prompts/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** PromptCard, DailyPromptCard, EnhancePromptCard, CreatePromptModal
- **Store init:** usePromptStore, useFolderStore
- **Server queries:** supabase.auth.getUser(), supabase.from('prompts').select(), supabase.from('folders').insert()

### /download

- **File:** apps/dashboard/src/app/download/page.tsx
- **Rendering:** Client Component
- **Auth:** Not Applicable (Public)
- **Top-level components:** FeatureCard, Step
- **Store init:** none
- **Server queries:** none

### /images

- **File:** apps/dashboard/src/app/images/page.tsx
- **Rendering:** Server Component
- **Auth:** Required
- **Top-level components:** ImagesPage, Suspense
- **Store init:** ⚠️ TODO: Store init happens in client component (ImagesPage)
- **Server queries:** supabase.auth.getUser()

### /folder/\[id\]

- **File:** apps/dashboard/src/app/folder/\[id\]/page.tsx
- **Rendering:** Server Component
- **Auth:** Required
- **Top-level components:** FolderHeader, ChatCard, Link, Home, ChevronRight, FolderIcon
- **Store init:** ⚠️ TODO: Store init happens in client components (FolderHeader, ChatCard)
- **Server queries:** supabase.auth.getUser(), supabase.from('folders').select()..., supabase.from('chats').select()...

### /studio

- **File:** apps/dashboard/src/app/studio/page.tsx
- **Rendering:** Server Component + Client hydration
- **Auth:** ⚠️ TODO: check auth (likely handled by parent layout/middleware)
- **Top-level components:** ChatStudio, Suspense
- **Store init:** ⚠️ TODO: Store init happens in client component (ChatStudio)
- **Server queries:** none

### /extension-auth

- **File:** apps/dashboard/src/app/extension-auth/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** CheckCircle2, Chrome, Loader2 (from lucide-react)
- **Store init:** none
- **Server queries:** none

### /auth/signin

- **File:** apps/dashboard/src/app/auth/signin/page.tsx
- **Rendering:** Client Component
- **Auth:** Not Applicable (Login page)
- **Top-level components:** LogIn, Mail, Lock, Loader2, Eye, EyeOff (from lucide-react)
- **Store init:** useAuthStore
- **Server queries:** none (supabase client-side auth)

### /auth/signup

- **File:** apps/dashboard/src/app/auth/signup/page.tsx
- **Rendering:** Client Component
- **Auth:** Not Applicable (Signup page)
- **Top-level components:** UserPlus, Mail, Lock, User, Loader2 (from lucide-react)
- **Store init:** useAuthStore
- **Server queries:** none (supabase client-side auth)

### /profile

- **File:** apps/dashboard/src/app/profile/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** User, Shield, CreditCard, Bell, Code, Pencil, Mail, Moon, Sun, Monitor, Check, Settings, Download, LogOut, Lock, Eye, EyeOff, X (from lucide-react)
- **Store init:** none
- **Server queries:** supabase.auth.getUser(), supabase.from('users').select(), /api/avatar/upload, /api/images

### /archive

- **File:** apps/dashboard/src/app/archive/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** ChatCard, Archive (from lucide-react)
- **Store init:** useChatStore
- **Server queries:** supabase.auth.getUser(), supabase.from('chats').select()

### /settings

- **File:** apps/dashboard/src/app/settings/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** Bell, Globe, Database, Folder, Star, Sparkles, Download, Upload, FileText, FileJson, Trash2, X, AlertTriangle, LogOut (from lucide-react)
- **Store init:** useFolderStore, useChatStore
- **Server queries:** /api/folders, /api/user/settings, /api/export, /api/chats, /api/import, /api/user/delete-account

### /chats/\[id\]

- **File:** apps/dashboard/src/app/chats/\[id\]/page.tsx
- **Rendering:** Server Component (redirects)
- **Auth:** Not Applicable (redirects)
- **Top-level components:** none
- **Store init:** none
- **Server queries:** none

### /chats

- **File:** apps/dashboard/src/app/chats/page.tsx
- **Rendering:** Client Component
- **Auth:** Required
- **Top-level components:** ChatCard, MasterToolbar, Link, MessageSquarePlus, MessageSquare, CheckSquare, Square, Trash2, AlertTriangle, LayoutGrid, Plus, FolderIcon, X, ChevronRight, Search, Calendar, Filter, Download, ChevronDown, Sparkles
- **Store init:** useChatStore, useFolderStore
- **Server queries:** /api/chats, /api/ai/search

---

### Visual Route Tree


app/
├── layout.tsx            → /
├── page.tsx              → /
├── archive/
│   └── page.tsx          → /archive
├── auth/
│   ├── signin/
│   │   └── page.tsx      → /auth/signin
│   └── signup/
│       └── page.tsx      → /auth/signup
├── chats/
│   ├── \[id\]/
│   │   └── page.tsx      → /chats/\[id\] (redirect)
│   └── page.tsx          → /chats
├── download/
│   └── page.tsx          → /download
├── folder/
│   └── \[id\]/
│       └── page.tsx      → /folder/\[id\]
├── images/
│   └── page.tsx          → /images
├── lists/
│   └── page.tsx          → /lists
├── profile/
│   └── page.tsx          → /profile
├── settings/
│   └── page.tsx          → /settings
└── studio/
    └── page.tsx          → /studio
