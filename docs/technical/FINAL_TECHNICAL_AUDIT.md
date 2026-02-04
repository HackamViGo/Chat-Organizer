# FINAL_TECHNICAL_AUDIT.md

## @[Geometry & Layout]

### Container & Grid
- **Main Container Max-Width**: Fluid (`flex-1`, no fixed `max-w` constraint, constrained by `lg:ml-64` margin in `LayoutWrapper`).
- **Grid Gaps**:
  - Metrics Grid: `gap-4` (1rem / 16px)
  - Main Content Grid: `gap-6` (1.5rem / 24px)

### Sidebar & Header
- **Sidebar Width (Base/Collapsed)**: `w-20` (5rem / 80px)
- **Sidebar Width (Hover Overlay)**: `w-64` (16rem / 256px)
- **Main Content Offset**: `ml-20` (80px) fixed margin to compensate for base sidebar.
- **Z-Index Standard**: `z-[60]` for Sidebar (Global priority over headers/toolbars).
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

**Card Cleanup Logic**:
- **Source**: `ChatCard.tsx`
- **Regex**: `(text).replace(/\[USER\]|You:|User:|Assistant:|Bot:/gi, '').trim()`
- **Goal**: Removes platform-specific speaker tokens and AI-generated noise from previews to maintain high signal-to-noise ratio.

**Visual Styles (Light)**:
- Background: `rgba(255, 255, 255, 0.7)`
- Backdrop Blur: `10px`
- Border: `1px solid rgba(255, 255, 255, 0.3)`
- Shadow: `0 8px 32px 0 rgba(31, 38, 135, 0.07)`

**Visual Styles (Dark)**:
- Shadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3)`

**Icon Mapping Engine (@brainbox/assets)**: [DONE]
- **Engine**: Centralized `@brainbox/assets` workspace package.
- **Provider-to-Asset Mapping**:
  - `chatgpt` -> `openai.png`
  - `claude` -> `claude.png`
  - `gemini` -> `gemini.png`
  - `grok` -> `grok.png`
  - `perplexity` -> `perplexity.png`
  - `fallback` -> `default-bot.png`
- **Visual Fix**: Replaced Lucide `Sparkles` and `react-icons/si` with high-fidelity brand assets (PNG/SVG) rendered via `img` tags.
- **Implementation**: Refactored `ChatCard.tsx`, `PlatformIcon`, and `PlatformBadge` components.

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
### Recursive Navigation Engine (v3.0)
**File**: `Sidebar.tsx`
**Logic**:
1. **Tree Construction**: Flat folder array is transformed into a `children`-based recursive tree in a `usePathname()` context.
2. **Context Filtering**:
   - `/chats` -> Only folders with `type: 'chat'` (root level).
   - `/prompts` -> Only folders with `type: 'prompt'` (root level).
3. **Visual Hierarchy (L-Shape)**:
   - **Vertical Line**: `border-l border-white/10` (ml-3).
   - **Horizontal Segment**: `before:absolute before:w-3 before:h-[1px] before:bg-white/10 before:left-[-12px] before:top-1/2`.
4. **Padding Calculation**:
   - **Formula**: `level * 12 + 8` px.
   - **Base Unit**: 12px per level of nesting.
5. **Active State Sync**:
   - **Classes**: `relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-11 before:bg-cyan-500 before:rounded-r-full`.
   - **Height Enhancement**: 44px (h-11) active bar for WCAG visual grouping compliance.

## @[Accessibility Compliance (WCAG 2.2)]

### Target Size (Success Criterion 2.5.8)
- **Master Toolbar Buttons**: `h-11` (Fixed 44px) and `min-w-[44px]`.
- **Icon Buttons**: Minimum 44px hit inheritance enforced via `min-w-[44px]`.
- **Verification**: Verified in `MasterToolbar.tsx` for all action buttons and the clear search button.

### Color Contrast (Success Criterion 1.4.3)
- **Primary Action (White on Cyan 600)**: ~4.1:1 (Passes AA for large text, needs 4.5:1 for small).
- **Secondary (Slate 300 on Slate 900)**: Improved contrast (Updated in ChatCard.tsx).
- **Secondary (Slate 400 on Slate 900)**: ~4.5:1 (Legacy baseline).
- **Selection Mode (Cyan 400 on Cyan 900/10)**: >7:1 (Passes AAA).
- **Status Indicators (Green/Red)**: WCAG compliant for error/success semantic meaning.

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
