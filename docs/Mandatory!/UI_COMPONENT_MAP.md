<!-- doc: UI_COMPONENT_MAP.md | version: 1.0 | last-updated: 2026-03-03 | author: DOCS_LIBRARIAN -->

# 📄 UI_COMPONENT_MAP.md

## Dashboard UI Components

### FolderHeader
- **Path:** apps/dashboard/src/components/features/folders/FolderHeader.tsx
- **Type:** feature
- **Props:** `{ folder: FolderType; chatCount: number }`
- **Renders:** Displays the header for a folder, including its name, chat count, and action buttons for editing and deleting.
- **Store:** useFolderStore
- **Children:** AlertTriangle, CheckCircle, Edit2, Trash2
- **Mode:** Client Component

### ListsPage
- **Path:** apps/dashboard/src/components/features/lists/ListsPage.tsx
- **Type:** feature
- **Props:** `{ initialLists: ListWithItems[] }`
- **Renders:** Manages and displays lists of items, allowing for creation, editing, and deletion of lists and list items.
- **Store:** useListStore
- **Children:** Plus, Trash2, Check, X, Edit2, GripVertical, CheckSquare, Square, Loader2, MoreVertical, FolderOpen
- **Mode:** Client Component

### PromptCard
- **Path:** apps/dashboard/src/components/features/prompts/PromptCard.tsx
- **Type:** feature
- **Props:** `{ prompt: Prompt; onEdit: (prompt: Prompt) => void }`
- **Renders:** Displays an individual prompt card with options to copy, edit, delete, and manage context menu visibility.
- **Store:** usePromptStore
- **Children:** AlertTriangle, Check, Copy, Edit2, Menu, MoreVertical, Trash2, Button
- **Mode:** Client Component

### EnhancePromptCard
- **Path:** apps/dashboard/src/components/features/prompts/EnhancePromptCard.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** A card for enhancing prompts, likely involving AI analysis.
- **Store:** none
- **Children:** FileEdit, Settings, Loader2, Copy, Check, Sparkles
- **Mode:** Client Component

### DailyPromptCard
- **Path:** apps/dashboard/src/components/features/prompts/DailyPromptCard.tsx
- **Type:** feature
- **Props:** `{ userPrompts?: Prompt[] }`
- **Renders:** Displays a daily prompt, with options to reveal, copy, and save it to the user's prompt library.
- **Store:** useAuthStore, usePromptStore
- **Children:** Copy, Check, Bookmark, Zap
- **Mode:** Client Component

### DailyPickCard
- **Path:** apps/dashboard/src/components/features/prompts/DailyPickCard.tsx
- **Type:** feature
- **Props:** `{ prompts: Prompt[] }`
- **Renders:** Displays a daily selected prompt from the user's library.
- **Store:** none
- **Children:** Zap, Play, Copy, Check
- **Mode:** Client Component

### CreatePromptModal
- **Path:** apps/dashboard/src/components/features/prompts/CreatePromptModal.tsx
- **Type:** feature
- **Props:** `{ isOpen: boolean; onClose: () => void; editingPrompt?: Prompt | null }`
- **Renders:** A modal for creating or editing a prompt, including title, content, color, and context menu visibility.
- **Store:** useAuthStore, usePromptStore
- **Children:** X, Check, Button, Input, Textarea
- **Mode:** Client Component

### ImagesPage
- **Path:** apps/dashboard/src/components/features/images/ImagesPage.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** A page for managing user images, including upload, search, and organization features.
- **Store:** useFolderStore, useImageStore
- **Children:** Upload, ImageIcon, Download, Trash2, FolderIcon, X, RefreshCw, LayoutGrid, Plus, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Check, AlertTriangle, Dice5, Search, CheckSquare, Square, FolderInput, FileImage, Calendar, HardDrive, ArrowUpAZ, FolderPlus, FolderMinus, Activity, Pill
- **Mode:** Client Component

### ChatBadges
- **Path:** apps/dashboard/src/components/features/chats/components/ChatBadges.tsx
- **Type:** feature
- **Props:** `{ chat: Chat; compact?: boolean }`
- **Renders:** Displays tags and tasks associated with a chat, along with the platform icon.
- **Store:** none
- **Children:** Tag, CheckSquare, PlatformIcon, PlatformBadge
- **Mode:** Client Component

### AIAnalysisModal
- **Path:** apps/dashboard/src/components/features/chats/components/AIAnalysisModal.tsx
- **Type:** feature
- **Props:** `{ chat: Chat; isOpen: boolean; onClose: () => void; onSaveContent: (content: string) => Promise<void>; isAnalyzing?: boolean; analysisStatus?: string }`
- **Renders:** A modal displaying AI analysis of a chat, allowing for editing and saving the content.
- **Store:** none
- **Children:** X, Maximize, Minimize, Sparkles, ExternalLink, Bold, Italic, Strikethrough, Code, Heading, List, Highlighter, MessageContent, PlatformBadge
- **Mode:** Client Component

### ChatActionMenu
- **Path:** apps/dashboard/src/components/features/chats/components/ChatActionMenu.tsx
- **Type:** feature
- **Props:** `{ chat: Chat; onEdit: () => void; onArchive: () => Promise<void>; onDownload: () => void; onDelete: () => Promise<void>; onMove: (folderId?: string) => Promise<void> }`
- **Renders:** A dropdown menu with actions for a chat, such as edit, move, archive, download, and delete.
- **Store:** useFolderStore
- **Children:** MoreVertical, Edit2, FolderInput, Download, Archive, ArchiveRestore, Trash2, X, AlertTriangle, Check, DefaultFolderIcon
- **Mode:** Client Component

### ChatCard
- **Path:** apps/dashboard/src/components/features/chats/ChatCard.tsx
- **Type:** feature
- **Props:** `{ chat: Chat }`
- **Renders:** A card displaying a single chat with its title, content, platform, tags, and actions.
- **Store:** useChatStore, useFolderStore
- **Children:** Check, CheckSquare, ExternalLink, Sparkles, MoreVertical, ChatBadges, PlatformIcon, ChatActionMenu, AIAnalysisModal
- **Mode:** Client Component

### MessageContent
- **Path:** apps/dashboard/src/components/features/chats/MessageContent.tsx
- **Type:** feature
- **Props:** `{ content: string }`
- **Renders:** Renders markdown content, handling code blocks separately.
- **Store:** none
- **Children:** Copy, Check, CodeBlock
- **Mode:** Client Component

### MasterToolbar
- **Path:** apps/dashboard/src/components/features/chats/MasterToolbar.tsx
- **Type:** feature
- **Props:** `{ searchQuery: string; onSearchChange: (value: string) => void; onClearSearch: () => void; showFilters: boolean; onToggleFilters: () => void; hasActiveFilters: boolean; onNewChat: () => void; isSemanticSearch: boolean; onToggleSemanticSearch: () => void; selectedCount?: number; onSelectAll?: () => void; onDeselectAll?: () => void; allSelected?: boolean; onDeleteSelected?: () => void; isDownloading?: boolean; isDeleting?: boolean; downloadMenu?: React.ReactNode }`
- **Renders:** A toolbar for chat management, including search, filters, new chat button, and bulk actions.
- **Store:** none
- **Children:** Search, Filter, Plus, X, Sparkles
- **Mode:** Server Component

### CodeBlock
- **Path:** apps/dashboard/src/components/features/chats/CodeBlock.tsx
- **Type:** feature
- **Props:** `{ code: string; language?: string }`
- **Renders:** Displays a code block with syntax highlighting and a copy-to-clipboard button.
- **Store:** none
- **Children:** Check, Copy
- **Mode:** Client Component

### ChatStudio
- **Path:** apps/dashboard/src/components/features/chats/ChatStudio.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** The main interface for interacting with AI chats, including message input, chat history, and AI features.
- **Store:** useAuthStore, useChatStore
- **Children:** Send, Bot, Sparkles, Plus, Zap, Trash2, ArrowLeft, Settings, CheckCircle, Lock, Key, Crown, Button, Input, Textarea
- **Mode:** Client Component

### GlobalBrain
- **Path:** apps/dashboard/src/components/features/brain/GlobalBrain.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** A global brain interface, likely for cross-chat AI functionalities or insights.
- **Store:** useChatStore, useUIStore
- **Children:** BrainCircuit, Send, X, Sparkles, User
- **Mode:** Client Component

### NotificationsCard
- **Path:** apps/dashboard/src/components/features/dashboard/NotificationsCard.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** Displays recent notifications or alerts to the user.
- **Store:** none
- **Children:** Bell, CheckCircle2, AlertCircle
- **Mode:** Client Component

### DashboardMetrics
- **Path:** apps/dashboard/src/components/features/dashboard/DashboardMetrics.tsx
- **Type:** feature
- **Props:** `{ metrics: { activeProjects: number; totalTokens: number; totalChats: number; timeSavedHours: number }; percentageChanges: { projects: number; tokens: number; chats: number; time: number } }`
- **Renders:** Displays key performance indicators and metrics for the user's activity.
- **Store:** none
- **Children:** FolderKanban, Zap, MessageSquare, Clock, TrendingUp, TrendingDown, MetricCard, Icon
- **Mode:** Client Component

### UsageChart
- **Path:** apps/dashboard/src/components/features/dashboard/UsageChart.tsx
- **Type:** feature
- **Props:** `{ data: UsageDay[]; chats: any[] }`
- **Renders:** Displays a chart visualizing platform activity and usage limits.
- **Store:** none
- **Children:** Sparkles
- **Mode:** Client Component

### RecentProjects
- **Path:** apps/dashboard/src/components/features/dashboard/RecentProjects.tsx
- **Type:** feature
- **Props:** `{ projects: Project[] }`
- **Renders:** Displays a list of recently active projects or folders.
- **Store:** none
- **Children:** ArrowUpRight, FolderKanban, Link
- **Mode:** Client Component

### ChatStatisticsCard
- **Path:** apps/dashboard/src/components/features/dashboard/ChatStatisticsCard.tsx
- **Type:** feature
- **Props:** `{ totalChats: number; archivedChats: number; chatsByPlatform: Record<string, number> }`
- **Renders:** Displays statistics about chats, including total, archived, and platform distribution.
- **Store:** none
- **Children:** MessageSquare, Archive, Layers
- **Mode:** Client Component

### SystemStatusCard
- **Path:** apps/dashboard/src/components/features/dashboard/SystemStatusCard.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** Displays the overall system status, possibly with indicators for various services.
- **Store:** none
- **Children:** CheckCircle2, AlertCircle
- **Mode:** Client Component

### UserInfoCard
- **Path:** apps/dashboard/src/components/features/dashboard/UserInfoCard.tsx
- **Type:** feature
- **Props:** `{ email: string; memberSince: string }`
- **Renders:** Displays basic user information like email and membership date.
- **Store:** none
- **Children:** none
- **Mode:** Client Component

### GPT5AlphaCard
- **Path:** apps/dashboard/src/components/features/dashboard/GPT5AlphaCard.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** A promotional or informational card related to GPT-5 Alpha.
- **Store:** none
- **Children:** Sparkles, ArrowUpRight
- **Mode:** Client Component

### DailyPromptTipCard
- **Path:** apps/dashboard/src/components/features/dashboard/DailyPromptTipCard.tsx
- **Type:** feature
- **Props:** `⚠️ TODO: not found`
- **Renders:** Displays a daily tip or suggestion for using prompts.
- **Store:** none
- **Children:** Lightbulb, ArrowUpRight
- **Mode:** Client Component

### DataProvider
- **Path:** apps/dashboard/src/components/providers/DataProvider.tsx
- **Type:** provider
- **Props:** `⚠️ TODO: not found`
- **Renders:** Provides data to its children components, likely fetching initial data from Supabase and managing real-time updates.
- **Store:** useAuthStore, useChatStore, useFolderStore, usePromptStore
- **Children:** none
- **Mode:** Client Component

### ThemeProvider
- **Path:** apps/dashboard/src/components/providers/ThemeProvider.tsx
- **Type:** provider
- **Props:** `⚠️ TODO: not found`
- **Renders:** Provides theme context to its children components, enabling dark mode and other theme-related features.
- **Store:** none
- **Children:** NextThemesProvider
- **Mode:** Client Component

### SessionBroadcaster
- **Path:** apps/dashboard/src/components/providers/SessionBroadcaster.tsx
- **Type:** provider
- **Props:** `⚠️ TODO: not found`
- **Renders:** Broadcasts Supabase session changes to other parts of the application, possibly including the extension.
- **Store:** useAuthStore
- **Children:** none
- **Mode:** Client Component

### FolderTree
- **Path:** apps/dashboard/src/components/layout/FolderTree.tsx
- **Type:** layout
- **Props:** `{ initialFolders: Folder[]; chats: Chat[]; prompts: Prompt[]; images: Image[]; lists: ListWithItems[]; currentActiveItemId: string | null; onSelectFolder: (folderId: string | null) => void; onOpenChat: (chatId: string) => void; onOpenPrompt: (promptId: string) => void; onOpenImage: (imageId: string) => void; onOpenList: (listId: string) => void; onExpandChange?: (isExpanded: boolean) => void; }`
- **Renders:** A hierarchical tree view of folders, displaying chats, prompts, images, and lists within them.
- **Store:** useChatStore
- **Children:** AnimatePresence, ChevronDown, FolderIcon, FolderOpen, LayoutGrid, Archive, FileEdit, Settings, MessageCircle, FolderTreeItem, FolderTreeItemProps, Icon, Link
- **Mode:** Client Component

### HybridSidebar
- **Path:** apps/dashboard/src/components/layout/HybridSidebar.tsx
- **Type:** layout
- **Props:** `⚠️ TODO: not found`
- **Renders:** A dynamic sidebar that can display different content based on the application state, including navigation, folder tree, and settings.
- **Store:** useChatStore, useFolderStore, usePromptStore, useUIStore
- **Children:** LayoutGrid, Settings, FileEdit, MessageCircle, Brain, Sun, Moon, X, Search, ListTodo, ChevronLeft, AnimatePresence, LayoutGroup, FolderTreeItem, HybridSidebarContent, Icon, Link, NavItem, NavItemProps, Set, SidebarEmptyState, SidebarSkeleton, Suspense, ThemeToggle
- **Mode:** Client Component

### LayoutWrapper
- **Path:** apps/dashboard/src/components/layout/LayoutWrapper.tsx
- **Type:** layout
- **Props:** `{ children: React.ReactNode }`
- **Renders:** A wrapper component that provides the overall layout for the application, including the sidebar and data provider.
- **Store:** useUIStore
- **Children:** HybridSidebar, DataProvider, Menu
- **Mode:** Client Component

### tabs
- **Path:** apps/dashboard/src/components/ui/tabs.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A tabbed interface component.
- **Store:** none
- **Children:** TabsPrimitive
- **Mode:** Client Component

### toast
- **Path:** apps/dashboard/src/components/ui/toast.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A toast notification component.
- **Store:** none
- **Children:** ToastPrimitives, X
- **Mode:** Client Component

### card
- **Path:** apps/dashboard/src/components/ui/card.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A generic card component.
- **Store:** none
- **Children:** HTMLDivElement
- **Mode:** Server Component

### dropdown-menu
- **Path:** apps/dashboard/src/components/ui/dropdown-menu.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A dropdown menu component.
- **Store:** none
- **Children:** Check, ChevronRight, Circle, DropdownMenuPrimitive, HTMLSpanElement
- **Mode:** Client Component

### textarea
- **Path:** apps/dashboard/src/components/ui/textarea.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A textarea input component.
- **Store:** none
- **Children:** none
- **Mode:** Server Component

### toaster
- **Path:** apps/dashboard/src/components/ui/toaster.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A container for toast notifications.
- **Store:** none
- **Children:** Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport
- **Mode:** Client Component

### input
- **Path:** apps/dashboard/src/components/ui/input.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A generic input component.
- **Store:** none
- **Children:** HTMLInputElement
- **Mode:** Server Component

### tooltip
- **Path:** apps/dashboard/src/components/ui/tooltip.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A tooltip component.
- **Store:** none
- **Children:** TooltipPrimitive
- **Mode:** Client Component

### badge
- **Path:** apps/dashboard/src/components/ui/badge.tsx
- **Type:** ui-primitive
- **Props:** `{ variant?: "default" | "secondary" | "destructive" | "outline"; className?: string; }`
- **Renders:** A badge component for displaying small status indicators.
- **Store:** none
- **Children:** HTMLDivElement
- **Mode:** Server Component

### button
- **Path:** apps/dashboard/src/components/ui/button.tsx
- **Type:** ui-primitive
- **Props:** `{ asChild?: boolean; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; size?: "default" | "sm" | "lg" | "icon"; }`
- **Renders:** A customizable button component.
- **Store:** none
- **Children:** Comp, HTMLButtonElement
- **Mode:** Server Component

### dialog
- **Path:** apps/dashboard/src/components/ui/dialog.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A dialog (modal) component.
- **Store:** none
- **Children:** DialogOverlay, DialogPortal, DialogPrimitive, HTMLDivElement, X
- **Mode:** Client Component

### label
- **Path:** apps/dashboard/src/components/ui/label.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A label component.
- **Store:** none
- **Children:** LabelPrimitive
- **Mode:** Client Component

### select
- **Path:** apps/dashboard/src/components/ui/select.tsx
- **Type:** ui-primitive
- **Props:** `⚠️ TODO: not found`
- **Renders:** A select (dropdown) component.
- **Store:** none
- **Children:** Check, ChevronDown, ChevronUp, SelectPrimitive, SelectScrollDownButton, SelectScrollUpButton
- **Mode:** Client Component
