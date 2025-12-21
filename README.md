# 🚀 Mega-Pack AI Studio

AI Chat Organizer - Intelligent Knowledge Manager built with Next.js 14, Supabase, and Google Gemini AI.

## ✨ Features

- 💬 **Smart Chat Management** - Organize and analyze your AI conversations
- 🗂️ **Folder System** - Categorize chats with custom folders
- 📝 **Prompt Library** - Save and reuse your favorite prompts
- 🎨 **Color Coding** - Visual organization with custom colors
- 🧠 **Global Brain** - Search across all your chats with AI-powered memory
- 🌙 **Dark/Light Theme** - System-aware theme switching
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔒 **Secure Authentication** - Powered by Supabase Auth

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini AI
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HackamViGo/Chat-Organizer.git
cd mega-pack
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual values:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
mega-pack/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── features/     # Feature-specific components
│   │   ├── layout/       # Layout components
│   │   ├── providers/    # Context providers
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   │   ├── services/     # API services
│   │   ├── supabase/     # Supabase clients
│   │   ├── utils/        # Helper functions
│   │   └── validation/   # Zod schemas
│   ├── store/            # Zustand stores
│   └── types/            # TypeScript types
├── public/               # Static assets
└── package.json
```

## 🔐 Security

- All sensitive data is stored in environment variables
- API keys are never exposed to the client
- Supabase Row Level Security (RLS) enabled
- User authentication required for all operations

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions, contact the repository owner.

## 📧 Contact

Repository: [https://github.com/HackamViGo/Chat-Organizer](https://github.com/HackamViGo/Chat-Organizer)

