🎨 UI Agent Personal Documentation

Agent: UI_AGENT
Role: UI/UX Development & Styling
Log File: docs/agents/logs/ui_agent.log


📋 Core Responsibilities

React Component Creation
Functional components with TypeScript
Custom hooks for reusable logic
Component composition patterns
Props validation with TypeScript
Tailwind CSS Styling
Glass morphism design system
Utility-first approach
Custom theme configuration
Dark mode support
Responsive Design
Mobile-first approach
Breakpoint management
Touch-friendly interfaces
Adaptive layouts
Dark Mode Support
Theme switching logic
CSS variable management
Persistent theme storage
System preference detection
🎯 Design System
Glass Morphism Pattern
tsx
// Standard glass panel
className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 dark:border-gray-700/50"

// Glass card with hover
className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-md border border-white/20 
          hover:bg-white/20 dark:hover:bg-gray-800/40 transition-all duration-200"

// Glass modal backdrop
className="backdrop-blur-sm bg-black/30"

// Glass button
className="bg-blue-500/80 hover:bg-blue-500/100 backdrop-blur-sm 
          border border-blue-400/30 transition-all"
Color Palette
Light Mode:

Background: bg-gradient-to-br from-blue-50 to-purple-50
Glass panels: bg-white/10 border-white/20
Text: text-gray-900
Accents: blue-500, purple-500, green-500
Dark Mode:

Background: bg-gradient-to-br from-gray-900 to-gray-800
Glass panels: bg-gray-800/30 border-gray-700/50
Text: text-gray-100
Accents: blue-400, purple-400, green-400
Platform Badges
tsx
// ChatGPT - Green
className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"

// Claude - Orange
className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30"

// Gemini - Blue
className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"

// Other - Gray
className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30"
🧩 Component Patterns
1. Modal Pattern
Location: src/components/ui/modal/Modal.tsx

tsx
// Standard modal structure
<div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30" onClick={onClose}>
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <div 
      className="bg-white/10 dark:bg-gray-800/30 backdrop-blur-md border 
                 border-white/20 dark:border-gray-700/50 rounded-xl p-6 
                 max-w-md w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal content */}
    </div>
  </div>
</div>
Best Practices:

Always include backdrop click to close
Stop propagation on modal content
Use Escape key to close
Focus trap inside modal
Animate entrance/exit
2. Card Pattern
Location: src/components/features/chats/ChatCard.tsx

tsx
// Standard card structure
<div className="group relative bg-white/10 dark:bg-gray-800/30 backdrop-blur-md 
                border border-white/20 dark:border-gray-700/50 rounded-xl p-6 
                hover:bg-white/20 dark:hover:bg-gray-800/40 transition-all 
                duration-200 shadow-lg hover:shadow-xl">
  {/* Card content */}
</div>
Features:

Platform badge (top-left)
Title with link
Summary (markdown)
Tasks list
Action buttons (Edit, Archive, Delete)
Created date (bottom-right)
3. Button Pattern
tsx
// Primary button
className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500/100 text-white 
          rounded-lg backdrop-blur-sm border border-blue-400/30 
          transition-all duration-200 shadow-md hover:shadow-lg"

// Secondary button
className="px-4 py-2 bg-white/10 hover:bg-white/20 dark:bg-gray-800/30 
          dark:hover:bg-gray-800/40 rounded-lg backdrop-blur-sm border 
          border-white/20 dark:border-gray-700/50 transition-all"

// Danger button
className="px-4 py-2 bg-red-500/80 hover:bg-red-500/100 text-white 
          rounded-lg backdrop-blur-sm border border-red-400/30 
          transition-all duration-200"
4. Input Pattern
tsx
// Standard input
className="w-full px-4 py-2 bg-white/10 dark:bg-gray-800/30 backdrop-blur-md 
          border border-white/20 dark:border-gray-700/50 rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 
          text-gray-900 dark:text-gray-100 placeholder-gray-500 
          dark:placeholder-gray-400 transition-all"

// With error state
className="... border-red-500/50 focus:ring-red-500/50"
📱 Responsive Patterns
Breakpoints (Tailwind)
tsx
// Mobile (default): < 640px
// Tablet: sm: >= 640px
// Desktop: md: >= 768px
// Large: lg: >= 1024px
// XL: xl: >= 1280px
Mobile-First Example
tsx
// Grid layout - mobile first
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Auto-adjusts based on screen size */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile only</div>
Sidebar Pattern
Desktop: Full sidebar visible
Mobile: Hamburger menu + slide-in sidebar

tsx
// Sidebar (desktop)
<aside className="hidden md:block w-64 fixed left-0 top-0 h-full">
  {/* Sidebar content */}
</aside>

// Mobile menu button
<button className="md:hidden fixed top-4 left-4 z-50">
  {/* Hamburger icon */}
</button>

// Mobile sidebar overlay
<div className={`md:hidden fixed inset-0 z-40 transform transition-transform 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
  {/* Sidebar content */}
</div>
🌙 Dark Mode Implementation
Theme Provider Setup
Location: src/providers/theme-provider.tsx

tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
Theme Switcher
Location: src/components/features/settings/ThemeSelector.tsx

tsx
import { useTheme } from 'next-themes'

const { theme, setTheme } = useTheme()

// Options: 'light' | 'dark' | 'system'
setTheme('dark')
Dark Mode Classes
tsx
// Always include both light and dark variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  {/* Content */}
</div>
Critical: Never forget dark: prefix for dark mode variants!

🎨 Animation Patterns
Transitions
tsx
// Standard transition
className="transition-all duration-200"

// Hover scale
className="transition-transform hover:scale-105"

// Smooth color change
className="transition-colors duration-300"
Loading States
tsx
// Spinner component
<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 
                border-blue-500"></div>

// Skeleton loader
<div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-4 w-full 
                rounded"></div>
Toast Notifications
Library: Sonner
Location: src/components/ui/toast/Toaster.tsx

tsx
import { toast } from 'sonner'

// Success
toast.success('Chat saved successfully!')

// Error
toast.error('Failed to save chat')

// Info
toast.info('Processing...')
🧪 UI Testing Checklist
Visual Testing
 Light mode renders correctly
 Dark mode renders correctly
 All hover states work
 All transitions are smooth
 Glass morphism effects visible
 Platform badges display correctly
 Responsive breakpoints work
Interaction Testing
 All buttons clickable
 Forms submit correctly
 Modals open/close
 Toast notifications appear
 Loading states show
 Error states display
Accessibility
 Keyboard navigation works
 Focus states visible
 ARIA labels present
 Color contrast sufficient
 Touch targets ≥ 44x44px
📁 Key UI Components
Layout Components
src/components/layout/Sidebar.tsx - Main navigation sidebar
src/components/layout/MobileMenu.tsx - Mobile hamburger menu
src/components/layout/Header.tsx - Page headers
Feature Components
src/components/features/chats/ChatCard.tsx - Chat display card
src/components/features/chats/CreateChatModal.tsx - Create chat form
src/components/features/folders/FolderCard.tsx - Folder display
src/components/features/folders/CreateFolderModal.tsx - Create folder form
src/components/features/prompts/PromptCard.tsx - Prompt display
src/components/features/settings/ThemeSelector.tsx - Theme switcher
UI Primitives
src/components/ui/modal/Modal.tsx - Base modal component
src/components/ui/button/Button.tsx - Button variants
src/components/ui/input/Input.tsx - Input fields
src/components/ui/dropdown/Dropdown.tsx - Dropdown menus
src/components/ui/toast/Toaster.tsx - Toast notifications
🔧 Tailwind Configuration
Location: tailwind.config.ts

Custom Theme Extensions
typescript
theme: {
  extend: {
    colors: {
      // Custom brand colors
    },
    backdropBlur: {
      xs: '2px',
    },
    animation: {
      'spin-slow': 'spin 3s linear infinite',
    }
  }
}
Custom Utilities
css
/* src/app/globals.css */
@layer utilities {
  .glass-panel {
    @apply bg-white/10 dark:bg-gray-800/30 backdrop-blur-md 
           border border-white/20 dark:border-gray-700/50;
  }
}
⚠️ Common Issues & Solutions
Issue: Dark mode flicker on page load
Solution: Ensure ThemeProvider wraps app and use suppressHydrationWarning on <html> tag

Issue: Glass effect not visible
Solution: Check backdrop-blur is enabled in Tailwind config and parent has non-transparent background

Issue: Responsive breakpoints not working
Solution: Verify Tailwind is processing the classes (check purge/content config)

Issue: Touch targets too small on mobile
Solution: Use min-h-[44px] min-w-[44px] for touch elements

Issue: Modal not closing on backdrop click
Solution: Check stopPropagation() on modal content and onClick={onClose} on backdrop

📚 Reference Links
Design System
Tailwind CSS Docs
Glass Morphism Generator
Color Palette Tool
React Patterns
React TypeScript Cheatsheet
React Hooks Guide
Accessibility
WCAG Guidelines
Accessible Components
🎯 Current Focus Areas
In Progress
✅ Glass morphism design system
✅ Dark mode implementation
✅ Responsive layouts
✅ Component library
Needs Attention
⚠️ Folder Edit modal (not functional)
⚠️ Search filters UI (partially implemented)
⚠️ Avatar upload UI (PRO feature)
Future Improvements
Animations polish
Micro-interactions
Loading skeleton improvements
Toast notification customization
📝 UI Agent Workflow
Before Starting UI Work
Read Best Practices
Check docs/agents/AI_BEST_PRACTICES_GUIDE.md (React, Tailwind sections)
Review existing component patterns
Check design system consistency
Review Context
Read docs/agents/agent_document.md
Check docs/agents/logs/ui_agent.log
Review related issues in docs/project/TODO.md
Check Dependencies
Verify API endpoints exist (coordinate with API_AGENT)
Confirm database schema (coordinate with DB_AGENT)
Check type definitions
During Development
Component Creation
Use TypeScript (strict mode)
Follow glass morphism pattern
Include light + dark mode styles
Add responsive breakpoints
Include loading states
Add error boundaries
Testing
Test in light mode
Test in dark mode
Test on mobile (Chrome DevTools)
Test keyboard navigation
Verify accessibility
Logging
Log to docs/agents/logs/ui_agent.log
Format: [TIMESTAMP] [ACTION] [STATUS] [DETAILS]
Be concise
After Completion
Documentation
Update this document if new patterns added
Update docs/agents/agent_document.md if affects other agents
Add component to reference list
Verification
Run npm run build (TypeScript check)
Run npm run lint (ESLint check)
Manual smoke test
💡 Tips & Tricks
Glass Morphism: Always use backdrop-blur-md with semi-transparent backgrounds
Dark Mode: Test both modes for every component - easy to forget
Responsive: Start mobile-first, then add larger breakpoints
Performance: Use transition-all sparingly (prefer specific properties)
Accessibility: Tab through your UI - if you can't navigate, it's not accessible
Consistency: Reuse existing components before creating new ones
State Management: Use Zustand for global UI state (modals, theme)
Icons: Material Symbols for most icons, Lucide React for special cases
Spacing: Follow 4px grid (p-2, p-4, p-6, etc.)
Colors: Use opacity with / notation for glass effects (bg-white/10)

Remember: UI is the first impression. Make it beautiful, fast, and accessible! ✨


