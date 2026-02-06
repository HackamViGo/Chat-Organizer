# 🧠 BrainBox: AI Workflow Reimagined (v2.1+)

**BrainBox** is the evolution of your AI workflow. Architected as a high-performance **Turborepo + Vite** monorepo ecosystem, it unifies a lightning-fast Chrome Extension with a sophisticated Next.js Dashboard to give you absolute control over your intelligence across ChatGPT, Claude, and Gemini.

---

## ✨ Features

### 🧩 1. Modern Monorepo Architecture (Turbo + Vite)
Re-engineered for speed and modularity:
- **Lightning Fast Builds**: Powered by **Vite** and **CRXJS**, the extension compiles instantly. ⚡
- **Shared Packages**: Complete synergy between Dashboard and Extension via shared logic (`@brainbox/shared`) and validation (`@brainbox/validation`). 🤝
- **Type-Safe Ecosystem**: Built entirely on **TypeScript**, ensuring stability and maintainability. 🛡️

### 🖱️ 2. Dynamic Context Menus
Forget static lists. Our new context menu is alive:
- **Smart Inject**: Detects AI platforms and intelligently offers your nested prompt library directly in the input field. 💉
- **Quick Access Folders**: Pin your favorite folders for sub-menu access. 📂
- **Recents (⚡ Quick)**: Your most recently used or updated prompts are always one click away.
- **Universal Search**: Search your entire prompt library directly via right-click! 🔍

### 🎯 3. Contextual "Smart" Capture
- **Seamless Capture**: Automatically extracts title, model, and the entire conversation thread from ChatGPT, Claude, and Gemini. 📥
- **Deep Linking**: Every saved chat retains a direct link to the source. 🔗
- **Cross-Platform Normalization**: Data from all AI models is normalized into a unified format for perfect dashboard visualization.

### 🗂️ 4. Hierarchical Organization
- **Deep Nesting**: Up to 4 levels of folders for complete freedom in structuring your "digital brain". 🧠
- **Visual Identity**: Dynamic gradients and 15+ icon categories (Lucide) for a premium look and feel. 🎨
- **Glassmorphism UI**: Modern design with blurred glass effects. ✨

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (Verified in `package.json` engines)
- **pnpm**: v9+ (Strictly enforced)

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start the full development environment (Dashboard + Extension)
pnpm dev

# Start only the Dashboard (http://localhost:3000)
pnpm dev:dashboard

# Start only the Extension (Watch mode)
pnpm dev:extension
```

### Build

```bash
# Build all apps and packages
pnpm build
```

---

## 🏗️ Tech Stack

- **Monorepo**: [Turborepo](https://turbo.build/)
- **Extension**: [Vite](https://vitejs.dev/) + [CRXJS](https://crxjs.dev/)
- **Dashboard**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Validation**: [Zod](https://zod.dev/)

---

## 🛡️ Quality Assurance

We enforce strict quality standards:
- **Linting**: `pnpm lint`
- **Type Checking**: `pnpm type-check`
- **Health Check**: `pnpm verify` (Requires Heath Score > 70 to push)

### Documentation
- [Contributing Guide](docs/technical/CONTRIBUTING.md)
- [Architecture Overview](docs/technical/ARCHITECTURE.md)
- [Technical Context](docs/technical/CONTEXT_MAP.md)

---

**BrainBox** - *AI Workflow. Reimagined.* 🧠💎