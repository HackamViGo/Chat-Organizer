# BrainBox UI Standards & Design System

**Project**: BrainBox AI Chat Organizer  
**Version**: 3.1.0  
**Stack**: Tailwind 4 + Next.js + JetBrains Mono  
**Theme**: Dark/Light (System Default)

---

## 1. Design Philosophy

BrainBox използва "Glassmorphism" естетика, комбинирана с изчистена типография, за да осигури премиум потребителско изживяване. Основната цел е висока четливост на AI съдържанието и лесна навигация.

## 2. Типография

- **Font Family**: `JetBrains Mono` (от Google Fonts).
- **Base Style**: `letter-spacing: -0.02em`.
- **Markdown Content**:
    - Font size: `0.95rem`.
    - Line height: `1.6`.
    - Code blocks: Моноширинен шрифт с лек фон и рамка.

## 3. Цветова Палитра (HSL)

Използва се Tailwind 4 за дефиниране на темите в `apps/dashboard/src/app/globals.css`.

| Token | Light Mode (H S L) | Dark Mode (H S L) |
|-------|-------------------|------------------|
| **Background** | `0 0% 100%` | `222.2 84% 4.9%` |
| **Foreground** | `222.2 84% 4.9%` | `210 40% 98%` |
| **Primary** | `221.2 83.2% 53.3%` | `217.2 91.2% 59.8%` |
| **Secondary** | `210 40% 96.1%` | `217.2 32.6% 17.5%` |
| **Border** | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` |

## 4. Компоненти и Ефекти

### 4.1 Glassmorphism (`.glass-card`)
- **Light**: `rgba(255, 255, 255, 0.7)` с `backdrop-filter: blur(10px)`.
- **Dark**: `rgba(30, 41, 59, 0.4)`.
- **Border**: Фина рамка (1px) с ниска прозрачност.

### 4.2 Анимации
- **`animate-pulse-scale`**: Използва се за интерактивни състояния (hover/click) с леко мащабиране (1.05).

### 4.3 UI Елементи
- **Radius**: Стандартен радиус от `0.5rem` (`--radius`).
- **Cards**: Използват `glass-card` за контента и списъците.

## 5. Специфики на Разширението (Extension)

- **Popup Width**: `400px` (стандарт за MV3).
- **Buttons**:
    - `.btn-primary`: Тъмен фон, светъл текст.
    - `.btn-secondary`: Прозрачен фон с рамка.
- **Interactions**: Използва същия `JetBrains Mono` за консистентност с Dashboard-а.

## 6. Добри Практики

1. **Accessibility**: Винаги използвайте семантични HTML тагове (`main`, `nav`, `section`).
2. **Responsiveness**: Мобилният дизайн е приоритет (Mobile-first). Dashboard-ът е PWA-ready.
3. **No Placeholders**: Използвайте реални икони (Lucide-react) и динамични данни.
4. **Consistency**: Всички нови компоненти трябва да наследят цветовете от `globals.css` променливите.

---
*Документът е актуализиран на 10.02.2026 от Meta-Architect.*
