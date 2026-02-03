# FINAL_TECHNICAL_AUDIT.md

## @[Geometry & Layout]

### Container & Grid
- **Main Container Max-Width**: Fluid (`flex-1`, no fixed `max-w` constraint, constrained by `lg:ml-64` margin in `LayoutWrapper`).
- **Grid Gaps**:
  - Metrics Grid: `gap-4` (1rem / 16px)
  - Main Content Grid: `gap-6` (1.5rem / 24px)

### Sidebar & Header
- **Sidebar Width (Collapsed/Icon-only)**: `w-20` (5rem / 80px)
- **Sidebar Width (Expanded/Nested)**: `w-20` (Stackable sidebars logic)
  - *Note: LayoutWrapper reserves `lg:ml-64` (16rem / 256px), suggesting space for ~3 stacked sidebars or a panel.*
- **Header Height**: Dynamic/No fixed global header.
  - Page specific top-bar space inferred from `calc(100vh - 4rem)` -> **4rem (64px)**.

## @[Component Anatomy]

### Button Variants
**Primary (Action)**
```css
bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors
```

**Secondary / Ghost (Icon Actions)**
```css
text-slate-400 hover:text-slate-900 (dark:hover:text-white) 
hover:bg-slate-200 (dark:hover:bg-white/10)
p-1 rounded-md transition-colors
```

**Filter / Toggle**
```css
border border-slate-300 (dark:border-slate-700)
text-slate-600 (dark:text-slate-400)
hover:border-cyan-300
rounded-lg px-4 py-2 transition-colors
```

**Active State (Filter)**
```css
border-cyan-500 bg-cyan-500/10 text-cyan-600
```

### Card (Glassmorphism)
**CSS Class**: `.glass-card`
**Padding**: `p-6` (Metrics/Dashboard) or `p-5` (Chat Cards)
**Radius**: `rounded-2xl` (Metrics) or `rounded-xl` (Chat Cards)

**Visual Styles (Light)**:
- Background: `rgba(255, 255, 255, 0.7)`
- Backdrop Blur: `10px`
- Border: `1px solid rgba(255, 255, 255, 0.3)`
- Shadow: `0 8px 32px 0 rgba(31, 38, 135, 0.07)`

**Visual Styles (Dark)**:
- Background: `rgba(30, 41, 59, 0.4)`
- Border: `1px solid rgba(255, 255, 255, 0.05)`
- Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`

## @[Navigation & Logic]

### Sidebar Icon Filter
**Function**: `getSortedFolders()` in `Sidebar.tsx`
**Logic**:
1. **Type Filter**: Filters folders by `type` derived from URL path (chat, image, prompt, list).
   - Default: `chat`
   - `/images` -> `image`
   - `/prompts` -> `prompt`
2. **Search**: Filters by `name` if `searchTerm` exists.
3. **Root Only**: `!parent_id` (Top-level folders only).
4. **Sorting**:
   - `name_asc` / `name_desc`
   - `date_new` / `date_old`
   - `custom` (Drag & Drop order)

### Active State (URL)
- **Folder Selection**: Query Parameter `?folder={id}`
- **Determination**: `currentFolderParam === folderId`

## @[Toolbar Engine]

### Layout Structure
**File**: `apps/dashboard/src/app/chats/page.tsx`
**Container**:
```tsx
<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
```
- **Title Section**: Left side (`div`).
- **Actions Section**: Right side Flex container.
  ```tsx
  <div className="flex items-center gap-3">
  ```

### Elements Alignment
1. **Search Input**: `relative group min-w-[200px]`
2. **AI Search Button**: Flex item
3. **Filters Toggle**: Flex item
4. **Bulk Actions** (Conditional): Flex item (Download/Delete)
5. **New Chat Button**: Flex item (`ml-2` implicit in gap)

**Alignment**: `items-center` (Vertical Center), `gap-3` (12px spacing).
