# 🤖 AI Best Practices Guide for BrainBox

**Purpose:** Comprehensive guide for AI agents working on BrainBox project  
**Last Updated:** 2026-03-03  
**Version:** 1.2.0  
> **Бележка:** Tailwind секцията е изцяло актуализирана за v4 (CSS-first). Tailwind v3 и `tailwind.config.ts` са депрекирани.

---

## 📚 Table of Contents

1. [DOM API Best Practices](#dom-api-best-practices)
2. [Web Platform APIs](#web-platform-apis)
3. [Browser Storage (localStorage/window)](#browser-storage)
4. [Google Cloud API Keys](#google-cloud-api-keys)
5. [React 18/19 Best Practices](#react-1819-best-practices)
6. [Zustand State Management](#zustand-state-management)
7. [Tailwind CSS Best Practices](#tailwind-css-best-practices)
8. [React Hook Form Best Practices](#react-hook-form-best-practices)
9. [Supabase Best Practices](#supabase-best-practices)
10. [Next.js Best Practices](#nextjs-best-practices)
11. [File Upload & Image Handling](#file-upload--image-handling)
12. [Chrome Extension Best Practices](#chrome-extension-best-practices)
13. [Testing Best Practices (Playwright)](#testing-best-practices-playwright)
14. [Accessibility (a11y) Best Practices](#accessibility-a11y-best-practices)
15. [PWA Best Practices](#pwa-best-practices)
16. [SEO Best Practices](#seo-best-practices)
17. [Security Best Practices](#security-best-practices)
18. [Performance Optimization](#performance-optimization)
19. [Error Handling](#error-handling)
20. [Rate Limiting & Throttling](#rate-limiting--throttling)
21. [Monitoring & Logging](#monitoring--logging)
22. [Caching Strategies](#caching-strategies)
23. [Bundle Optimization](#bundle-optimization)
24. [API Versioning](#api-versioning)
25. [Internationalization (i18n)](#internationalization-i18n)
26. [Webhooks & Event Handling](#webhooks--event-handling)
27. [🚫 Всичко забранено (Prohibited Practices)](#-всичко-забранено-prohibited-practices)
28. [TypeScript Best Practices](#typescript-best-practices)

---

## 🌐 DOM API Best Practices

### Event Listener Optimization

**Reference:** [DOM Living Standard - EventListenerOptions](https://dom.spec.whatwg.org/#dictdef-eventlisteneroptions)

#### ✅ Use Passive Event Listeners

```javascript
// ❌ BAD - Blocks scrolling
window.addEventListener('scroll', scrollHandler);

// ✅ GOOD - Passive listener improves performance
window.addEventListener('scroll', scrollHandler, { 
  passive: true,
  capture: false 
});
```

**Benefits:**
- Browser can optimize scrolling without waiting for handler
- 30-50% performance improvement in scroll/resize handling
- Better user experience with smoother animations

**Reference:** [Passive Event Listeners](https://dom.spec.whatwg.org/#dom-addeventlisteneroptions-passive)

#### ✅ Use Once Option for One-Time Events

```javascript
// ✅ GOOD - Automatically removes listener after first call
button.addEventListener('click', handleClick, { once: true });
```

**Reference:** [Once Option](https://dom.spec.whatwg.org/#dom-addeventlisteneroptions-once)

#### ✅ Use AbortController for Cleanup

```javascript
// ✅ GOOD - Easy cleanup with AbortController
const controller = new AbortController();
element.addEventListener('click', handler, { 
  signal: controller.signal 
});

// Later: controller.abort() removes all listeners
```

**Reference:** [AbortController](https://dom.spec.whatwg.org/#abortcontroller), [AbortSignal](https://dom.spec.whatwg.org/#abortsignal)

### MutationObserver Best Practices

**Reference:** [MutationObserver Interface](https://dom.spec.whatwg.org/#interface-mutationobserver)

#### ✅ Use attributeFilter for Specific Attributes

```javascript
// ✅ GOOD - Only observe specific attributes
const observer = new MutationObserver(callback);
observer.observe(element, {
  attributes: true,
  attributeFilter: ['class', 'data-state'], // Only these attributes
  childList: false,
  subtree: false
});
```

**Reference:** [MutationObserverInit.attributeFilter](https://dom.spec.whatwg.org/#dom-mutationobserverinit-attributefilter)

#### ✅ Use attributeOldValue Sparingly

```javascript
// ✅ GOOD - Only when you need old value
observer.observe(element, {
  attributes: true,
  attributeOldValue: true // Only if needed
});
```

**Reference:** [MutationObserverInit.attributeOldValue](https://dom.spec.whatwg.org/#dom-mutationobserverinit-attributeoldvalue)

### Performance Optimization

#### ✅ Use requestAnimationFrame for Animations

```javascript
// ✅ GOOD - Smooth animations
function animate() {
  // Update animation
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

**Reference:** [requestAnimationFrame](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-animationframeprovider-requestanimationframe)

#### ✅ Use IntersectionObserver for Visibility

```javascript
// ✅ GOOD - Efficient visibility detection
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible
    }
  });
});
observer.observe(element);
```

**Reference:** [IntersectionObserver](https://w3c.github.io/IntersectionObserver/)

#### ✅ Use DocumentFragment for Batch DOM Updates

```javascript
// ✅ GOOD - Batch DOM updates
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  fragment.appendChild(createElement());
}
container.appendChild(fragment); // Single reflow
```

**Reference:** [DocumentFragment](https://dom.spec.whatwg.org/#interface-documentfragment)

### DOM Query Optimization

#### ✅ Use Element.matches() for Selector Matching

```javascript
// ✅ GOOD - Efficient selector matching
if (element.matches('.active')) {
  // Handle active state
}
```

**Reference:** [Element.matches](https://dom.spec.whatwg.org/#dom-element-matches)

### Complete DOM References

- [DOM Living Standard](https://dom.spec.whatwg.org/)
- [EventListenerOptions](https://dom.spec.whatwg.org/#dictdef-eventlisteneroptions)
- [MutationObserver](https://dom.spec.whatwg.org/#interface-mutationobserver)
- [AbortController](https://dom.spec.whatwg.org/#abortcontroller)
- [IntersectionObserver](https://w3c.github.io/IntersectionObserver/)
- [requestAnimationFrame](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-animationframeprovider-requestanimationframe)

---

## 🌐 Web Platform APIs

**Reference:** [Chrome Web Platform Documentation](https://developer.chrome.com/docs/web-platform/)

### View Transition API

#### ✅ Smooth Page Transitions

```typescript
// ✅ GOOD - Smooth transitions between views
document.startViewTransition(() => {
  // Update DOM
  updateView();
});

// With CSS
// @view-transition {
//   navigation: auto;
// }
```

**Reference:** [View Transition API](https://developer.chrome.com/docs/web-platform/view-transitions/)

#### ✅ Navigation API for Client-Side Routing

```typescript
// ✅ GOOD - Modern navigation API
navigation.addEventListener('navigate', (event) => {
  event.intercept({
    handler: async () => {
      // Handle navigation
      await loadPage(event.destination.url);
    },
  });
});
```

**Reference:** [Navigation API](https://developer.chrome.com/docs/web-platform/navigation-api/)

### Speculation Rules API

#### ✅ Prefetch and Prerender Pages

```html
<!-- ✅ GOOD - Prefetch and prerender pages -->
<script type="speculationrules">
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/chats", "/folders"]
    }
  ],
  "prerender": [
    {
      "source": "document",
      "where": { "href_matches": "/chat/*" }
    }
  ]
}
</script>
```

**Reference:** [Speculation Rules API](https://developer.chrome.com/docs/web-platform/speculation-rules/)

### Page Lifecycle API

#### ✅ Handle Page Lifecycle Events

```typescript
// ✅ GOOD - Handle page lifecycle events
if ('document' in self && 'visibilityState' in document) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Page is hidden - save state
      saveState();
    }
  });
}
```

**Reference:** [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api/)

### Early Hints

#### ✅ Use Early Hints for Resource Hints

```typescript
// ✅ GOOD - Server sends 103 Early Hints
// In Next.js middleware or API route
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Send early hints for critical resources
  response.headers.set('Link', '</fonts/main.woff2>; rel=preload; as=font');
  response.headers.set('Link', '</styles.css>; rel=preload; as=style');
  
  return response;
}
```

**Reference:** [Early Hints](https://developer.chrome.com/docs/web-platform/early-hints/)

### Picture-in-Picture API

#### ✅ Picture-in-Picture for Any Element

```typescript
// ✅ GOOD - Picture-in-Picture for any element
async function enablePictureInPicture(element: HTMLElement) {
  if ('requestPictureInPicture' in document) {
    try {
      await (element as any).requestPictureInPicture();
    } catch (error) {
      console.error('Picture-in-Picture failed:', error);
    }
  }
}
```

**Reference:** [Picture-in-Picture API](https://developer.chrome.com/docs/web-platform/picture-in-picture/)

---

## 💾 Browser Storage (localStorage/window)

### Mandatory Checks

**ALWAYS** follow this pattern:

```typescript
if (typeof window !== 'undefined') {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'SecurityError') {
        console.warn('localStorage access denied, skipping');
        // App continues to work without localStorage
      } else if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded');
        // Handle quota exceeded
      }
    }
  }
}
```

### Prohibited Patterns

❌ **NEVER do this:**
```typescript
// ❌ BAD - No window check
localStorage.getItem('key');

// ❌ BAD - No try-catch
localStorage.setItem('key', 'value');

// ❌ BAD - Direct access
window.localStorage.getItem('key');
```

### Allowed Usage

✅ **Safe to store:**
- User preferences (remember me, theme, etc.)
- Client-side caching (with expiration)
- Temporary UI state (can be lost)

❌ **NEVER store:**
- Authentication tokens (use cookies or chrome.storage)
- Sensitive data (use secure storage)
- Critical application state (use database)

### Common Error Scenarios

1. **SecurityError** - Access denied (iframe, sandbox)
   - **Solution:** Graceful degradation, app continues without localStorage

2. **QuotaExceededError** - Storage full
   - **Solution:** Clear old cache, reduce stored data

3. **Window undefined** - Server-side rendering
   - **Solution:** Always check `typeof window !== 'undefined'`

---

## 🔑 Google Cloud API Keys

### Best Practices

**Reference:** [Google Cloud API Keys Documentation](https://docs.cloud.google.com/docs/authentication/api-keys-use#node.js)

#### ✅ Server-Side Storage

```typescript
// ✅ GOOD - Server-side only
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY not found');
}
```

#### ✅ Validation

```typescript
// ✅ GOOD - Validate API key format
if (typeof apiKey !== 'string' || apiKey.length < 20) {
  throw new Error('Invalid API key format');
}
```

#### ✅ Error Handling

```typescript
// ✅ GOOD - Proper error handling
try {
  const result = await model.generateContent(prompt);
} catch (error: any) {
  if (error?.message?.includes('API_KEY')) {
    throw new Error('Invalid or missing API key');
  }
  if (error?.status === 429) {
    throw new Error('API quota exceeded');
  }
  if (error?.status === 403) {
    throw new Error('API access forbidden');
  }
  throw error;
}
```

#### ❌ Prohibited Patterns

```typescript
// ❌ BAD - Client-side API key
const apiKey = localStorage.getItem('apiKey'); // NEVER!

// ❌ BAD - Hardcoded API key
const apiKey = 'AIzaSy...'; // NEVER!
```

### Node.js Implementation

**Reference:** [Google Cloud API Keys - Node.js](https://docs.cloud.google.com/docs/authentication/api-keys-use#node.js)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const getClient = (apiKeyOverride?: string) => {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found');
  }
  return new GoogleGenerativeAI(apiKey);
};
```

---

## ⚛️ React 18/19 Best Practices

### Error Boundaries & Suspense

**Reference:** [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

#### ✅ Use Error Boundaries for Error Handling

```typescript
// ❌ BAD - Try/catch around `use` hook doesn't work
function Component({promise}) {
  try {
    const data = use(promise); // Won't catch - `use` suspends, not throws
    return <div>{data}</div>;
  } catch (error) {
    return <div>Failed to load</div>; // Unreachable
  }
}

// ✅ GOOD - Error boundary catches `use` errors
function App() {
  return (
    <ErrorBoundary fallback={<div>Failed to load</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <DataComponent promise={fetchData()} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

#### ✅ Combine Suspense with Error Boundaries

```typescript
'use client';

import { use, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export function MessageContainer({ messagePromise }) {
  return (
    <ErrorBoundary fallback={<p>⚠️ Something went wrong</p>}>
      <Suspense fallback={<p>⌛ Downloading message...</p>}>
        <Message messagePromise={messagePromise} />
      </Suspense>
    </ErrorBoundary>
  );
}

function Message({ messagePromise }) {
  const content = use(messagePromise);
  return <p>Here is the message: {content}</p>;
}
```

### Hooks Optimization

#### ✅ Use useMemo for Expensive Calculations

```typescript
// ✅ GOOD - Cache expensive computations
import { useMemo, useCallback } from 'react';

function ProductPage({ productId, referrer }) {
  const product = useData('/product/' + productId);

  const requirements = useMemo(() => {
    return computeRequirements(product);
  }, [product]);

  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', {
      referrer,
      orderDetails,
    });
  }, [productId, referrer]);

  return <ShippingForm requirements={requirements} onSubmit={handleSubmit} />;
}
```

#### ✅ use Hook for Promises

```typescript
// ✅ GOOD - use hook can be called in loops and conditionals
function Component({ promise }) {
  // Unlike other hooks, `use` can be called conditionally
  if (!promise) return null;
  
  const data = use(promise); // Suspends if promise is pending
  return <div>{data}</div>;
}
```

**Key Points:**
- `use` hook suspends component execution (doesn't throw)
- Must be wrapped in Suspense boundary
- Can be called in loops and conditionals (unlike other hooks)
- Errors are caught by Error Boundaries, not try/catch

**Reference:** [React use Hook](https://react.dev/reference/react/use)

### Advanced Hooks

#### ✅ useTransition for Non-Blocking Updates

```typescript
// ✅ GOOD - Mark state updates as non-blocking transitions
import { useTransition, useState } from 'react';

function SearchResults({ query }) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  const handleSearch = (newQuery: string) => {
    // Urgent: Update input immediately
    setQuery(newQuery);
    
    // Non-urgent: Update results in background
    startTransition(() => {
      setResults(expensiveSearch(newQuery));
    });
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <span>Searching...</span>}
      <ResultsList results={results} />
    </div>
  );
}
```

**Key Points:**
- `isPending` indicates if transition is in progress
- `startTransition` marks updates as non-blocking
- Keeps UI responsive during expensive operations
- Can be nested for complex update flows

**Reference:** [React useTransition](https://react.dev/reference/react/useTransition)

#### ✅ useDeferredValue for Deferred Updates

```typescript
// ✅ GOOD - Defer expensive value updates
import { useState, useDeferredValue } from 'react';

function ProductList({ products }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // Expensive filtering uses deferred value
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [products, deferredQuery]);

  return (
    <>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
      />
      <ProductGrid products={filteredProducts} />
    </>
  );
}
```

**Key Points:**
- Returns previous value during transition
- Automatically updates when transition completes
- Works with Suspense boundaries
- No fixed delay - React optimizes timing

**Reference:** [React useDeferredValue](https://react.dev/reference/react/useDeferredValue)

#### ✅ useId for Unique IDs

```typescript
// ✅ GOOD - Generate unique IDs for SSR compatibility
import { useId } from 'react';

function FormField({ label }) {
  const id = useId();
  
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" />
    </>
  );
}

// ✅ GOOD - Multiple IDs from single hook
function Form() {
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  
  return (
    <form id={formId}>
      <label htmlFor={emailId}>Email</label>
      <input id={emailId} />
      <label htmlFor={passwordId}>Password</label>
      <input id={passwordId} />
    </form>
  );
}
```

**Key Points:**
- Generates stable IDs across server/client renders
- Prevents hydration mismatches
- Can generate multiple IDs by appending suffixes
- Never use for keys in lists

**Reference:** [React useId](https://react.dev/reference/react/useId)

#### ✅ useSyncExternalStore for External Stores

```typescript
// ✅ GOOD - Subscribe to external store (e.g., Zustand)
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

function Counter() {
  const count = useSyncExternalStore(
    useStore.subscribe,
    () => useStore.getState().count,
    () => 0 // Server snapshot
  );
  
  return <div>{count}</div>;
}
```

**Key Points:**
- Required for Zustand with React Server Components
- Provides server snapshot for SSR compatibility
- Ensures consistent state across server/client
- Subscribe function must return cleanup function

**Reference:** [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

---

## 🐻 Zustand State Management

### Basic Store Pattern

**Reference:** [Zustand Documentation](https://docs.pmnd.rs/zustand/)

#### ✅ TypeScript Store with Middleware

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {} from '@redux-devtools/extension'; // Required for devtools typing

interface BearState {
  bears: number;
  increase: (by: number) => void;
}

const useBearStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        bears: 0,
        increase: (by) => set((state) => ({ bears: state.bears + by })),
      }),
      {
        name: 'bear-storage',
      },
    ),
    { name: 'BearStore' }
  ),
);
```

### Middleware Composition

#### ✅ Compose Multiple Middleware

```typescript
// ✅ GOOD - Chain middleware in correct order
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create<State>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set) => ({
          nested: { count: 0 },
          increment: () => set((state) => {
            state.nested.count += 1; // Immer allows direct mutation
          }),
        }))
      ),
      { name: 'app-storage' }
    ),
    { name: 'AppStore' }
  )
);
```

**Middleware Order (outer to inner):**
1. `devtools` - Redux DevTools integration
2. `persist` - LocalStorage persistence
3. `subscribeWithSelector` - Granular subscriptions
4. `immer` - Immutable mutations

### Async Actions

#### ✅ Handle Async Operations

```typescript
// ✅ GOOD - Async actions with loading/error states
const useFishStore = create((set) => ({
  fishies: {},
  isLoading: false,
  error: null,
  fetch: async (pond) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(pond);
      const data = await response.json();
      set({ fishies: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

### DevTools Integration

#### ✅ Redux DevTools with Action Naming

```typescript
const useBearStore = create(
  devtools(
    (set) => ({
      bears: 0,
      increase: () => set(
        (state) => ({ bears: state.bears + 1 }),
        undefined,
        'bear/increase' // Action name
      ),
      addFishes: (count) => set(
        (prev) => ({ fishes: prev.fishes + count }),
        undefined,
        { type: 'bear/addFishes', count } // Action with payload
      ),
    }),
    {
      name: 'BearStore',
      enabled: process.env.NODE_ENV !== 'production',
    }
  )
);
```

### Persist Middleware

#### ✅ Persist with Versioning and Migration

```typescript
const useFishStore = create(
  persist(
    (set, get) => ({
      fishes: 0,
      addAFish: () => set({ fishes: get().fishes + 1 }),
    }),
    {
      name: 'food-storage',
      storage: createJSONStorage(() => sessionStorage), // or localStorage
      partialize: (state) => ({ fishes: state.fishes }), // Select what to persist
      version: 1,
      migrate: (persistedState, version) => {
        // Handle version migrations
        if (version === 0) {
          return { fishes: persistedState.fishes * 2 };
        }
        return persistedState;
      },
      onRehydrateStorage: (state) => {
        console.log('Hydration starts');
        return (state, error) => {
          if (error) console.error('Hydration failed', error);
          else console.log('Hydration finished', state);
        };
      },
    }
  )
);
```

**References:**
- [Zustand Documentation](https://docs.pmnd.rs/zustand/)
- [Zustand Middleware](https://docs.pmnd.rs/zustand/integrations/persisting-store-data)

---


## 🎨 Tailwind CSS Best Practices

### Tailwind v4 (CSS-first)

**Reference:** [Tailwind CSS v4.0 Documentation](https://tailwindcss.com/docs/v4-beta)

#### ✅ Use @import for Tokens
Всички нови проекти и компоненти трябва да ползват централизираните токени.

```css
/* apps/dashboard/src/app/globals.css */
@import "tailwindcss";
@import "@brainbox/ui/tokens";

@theme {
  --color-brand: var(--ui-color-platform-chatgpt);
}
```

#### ✅ Correct Dynamic Class Generation
Никога не конструирай класове динамично!

```html
<!-- ✅ GOOD - Коректни низове -->
<div class="{{ isActive ? 'bg-primary' : 'bg-secondary' }}"></div>

<!-- ❌ BAD - Не работи в v4 (JIT не го хваща) -->
<div class="bg-${color}-500"></div>
```

#### ✅ Use Platform Color Maps
За цветове на AI платформи използвай `PLATFORM_CLASSES` дефинирани в `UI_SYSTEM.md`.

### Dark Mode Strategy

#### ✅ Theme-based Dark Mode (Dashboard/Popup)
В v4 използваме `@variant dark` или директен `.dark` селектор в `@theme`.

```css
/* Custom utility в globals.css */
.glass-card {
  background: var(--ui-color-glass-bg);
  @variant dark {
    background: rgba(0, 0, 0, 0.8);
  }
}
```

#### ✅ Content Script Isolation
За UI инжектиран в чужди сайтове (ChatGPT/Claude): **Tailwind е ЗАБРАНЕН**.

```typescript
// ✅ GOOD - Само inline CSS в injectStyles()
const style = `.bb-menu { background: #fff; } @media (prefers-color-scheme: dark) { .bb-menu { background: #000; } }`;
```

### Responsive Design

#### ✅ Mobile-First Approach
Винаги тръгвай от мобилна версия (без префикс) и добавяй `md:`, `lg:`, `xl:` за по-големи екрани.

**References:**
- [UI_SYSTEM.md](../Mandatory!/UI_SYSTEM.md) — Основен документ за UI стандарти.
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

---

## 📝 React Hook Form Best Practices

### Zod Validation

**Reference:** [React Hook Form Documentation](https://react-hook-form.com/)

#### ✅ Form with Zod Resolver

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(1),
  age: z.number(),
});

type Schema = z.infer<typeof schema>;

const App = () => {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register('name')} />
      <input {...register('age', { valueAsNumber: true })} type="number" />
      <input type="submit" />
    </form>
  );
};
```

### Error Handling

#### ✅ Submit Error Handler

```typescript
import { useForm, SubmitHandler, SubmitErrorHandler } from 'react-hook-form';

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
};

export default function App() {
  const { register, handleSubmit } = useForm<FormValues>();
  const onSubmit: SubmitHandler<FormValues> = (data) => console.log(data);
  const onError: SubmitErrorHandler<FormValues> = (errors) => console.log(errors);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)}>
      <input {...register('firstName', { required: true })} />
      <input {...register('lastName', { minLength: 2 })} />
      <input type="email" {...register('email')} />
      <input type="submit" />
    </form>
  );
}
```

#### ✅ Server Error Handling

```typescript
const { register, handleSubmit, setError, formState: { errors } } = useForm({
  criteriaMode: 'all',
});

const onSubmit = async () => {
  const response = await fetch('/api/submit');
  if (response.status > 200) {
    setError('root.serverError', {
      type: response.status,
      message: 'Server error occurred'
    });
  }
};

// Display error
{errors.root?.serverError && (
  <p>Server error: {errors.root.serverError.message}</p>
)}
```

### Multiple Error Messages

#### ✅ Display All Validation Errors

```typescript
import { useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';

const { register, formState: { errors } } = useForm({
  criteriaMode: 'all', // Show all errors
});

<input
  {...register('input', {
    required: 'This is required.',
    pattern: {
      value: /\d+/,
      message: 'This input is number only.',
    },
    maxLength: {
      value: 10,
      message: 'This input exceed maxLength.',
    },
  })}
/>
<ErrorMessage
  errors={errors}
  name="input"
  render={({ messages }) =>
    messages && Object.entries(messages).map(([type, message]) => (
      <p key={type}>{message}</p>
    ))
  }
/>
```

**References:**
- [React Hook Form](https://react-hook-form.com/)
- [Zod Integration](https://react-hook-form.com/get-started#SchemaValidation)

---

## 🗄️ Supabase Best Practices

### Authentication

#### ✅ Dual Authentication Support

```typescript
// ✅ GOOD - Support both cookies and Bearer tokens
const authHeader = request.headers.get('Authorization');
if (authHeader && authHeader.startsWith('Bearer ')) {
  // Extension request - use token-based client
  supabase = createClient(url, key, {
    global: { headers: { Authorization: authHeader } }
  });
} else {
  // Web app request - use cookie-based client
  supabase = createServerClient(url, key, { cookies });
}
```

### Row Level Security (RLS)

#### ✅ Always Enable RLS

```sql
-- ✅ GOOD - RLS enabled on all tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- ✅ GOOD - User-specific policies
CREATE POLICY "Users can only see their own chats"
ON chats FOR SELECT
USING (auth.uid() = user_id);
```

#### ✅ Optimize RLS Policies

```sql
-- ✅ GOOD - Use subquery for better performance
CREATE POLICY "Users can only see their own chats"
ON chats FOR SELECT
USING (user_id = (SELECT auth.uid()));
```

### Storage

#### ✅ Use Supabase Storage for Files

```typescript
// ✅ GOOD - Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('images')
  .upload(fileName, buffer, {
    contentType: blob.type,
    upsert: false,
  });

// ✅ GOOD - Store only metadata in database
await supabase.from('images').insert({
  url: publicUrl,
  path: fileName,
  mime_type: blob.type,
  size: buffer.length
});
```

### Type Generation

#### ✅ Generate Types After Schema Changes

```bash
# ✅ GOOD - Always generate types after migrations
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

### Storage Best Practices

#### ✅ Create Bucket with File Restrictions

```typescript
// ✅ GOOD - Bucket with file size and MIME type restrictions
const { data, error } = await supabase.storage.createBucket('avatars', {
  public: true,
  allowedMimeTypes: ['image/*'],
  fileSizeLimit: '1MB', // 1MB limit for avatars
});
```

#### ✅ Image Transformation & Optimization

```typescript
// ✅ GOOD - Optimize image quality on download
const { data } = await supabase.storage
  .from('images')
  .download('image.jpg', {
    transform: {
      quality: 50 // 20-100, default: 80
    }
  });
```

**Quality Guidelines:**
- **20-40**: Highly compressed, small file size, noticeable quality loss
- **50-70**: Good balance between quality and file size
- **80-100**: High quality, larger file sizes
- **Default**: 80 for optimal balance

**References:**
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)

---

## ⚡ Next.js Best Practices

### API Routes

#### ✅ Proper Error Handling

```typescript
// ✅ GOOD - Comprehensive error handling
export async function POST(request: Request) {
  try {
    // ... logic
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
```

#### ✅ CORS Headers for Extensions

```typescript
// ✅ GOOD - CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};
```

### Server Components vs Client Components

#### ✅ Use 'use client' Only When Needed

```typescript
// ✅ GOOD - Server component by default
export default function Page() {
  // Server-side logic
}

// ✅ GOOD - Client component only for interactivity
'use client';
export function InteractiveComponent() {
  // Client-side logic with hooks
}
```

### Environment Variables

#### ✅ Proper Environment Variable Usage

```typescript
// ✅ GOOD - Public variables (client-side)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ✅ GOOD - Server-only variables
const apiKey = process.env.GEMINI_API_KEY; // Server-side only
```

### Server Actions & Caching

#### ✅ Server Actions with Cache

```typescript
// ✅ GOOD - Pass Server Action through 'use cache' component
export default async function Page() {
  const performUpdate = async () => {
    'use server';
    await db.update(...);
  };

  return <CachedComponent performUpdate={performUpdate} />;
}

async function CachedComponent({ performUpdate }) {
  'use cache';
  return <ClientComponent action={performUpdate} />;
}
```

#### ✅ Data Fetching Strategies

```typescript
// ✅ GOOD - Static data (cached until invalidated)
const staticData = await fetch(`https://...`, { cache: 'force-cache' });

// ✅ GOOD - Dynamic data (refetch on every request)
const dynamicData = await fetch(`https://...`, { cache: 'no-store' });

// ✅ GOOD - Revalidated data (cached with lifetime)
const revalidatedData = await fetch(`https://...`, {
  next: { revalidate: 10 }, // 10 seconds
});
```

#### ✅ Refresh Router from Server Action

```typescript
'use server';

import { refresh } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title');
  await db.post.create({ data: { title } });
  refresh(); // Revalidate and update UI
}
```

**Note:** `refresh()` can only be called from Server Actions, not Route Handlers.

#### ✅ Route Handler Caching

```typescript
// ✅ GOOD - Force static generation for GET handlers
export const dynamic = 'force-static';

export async function GET() {
  // This handler will be cached
}
```

**References:**
- [Next.js App Router](https://nextjs.org/docs/app)
- [Server Actions](https://nextjs.org/docs/app/api-reference/functions/server-actions)
- [Caching](https://nextjs.org/docs/app/building-your-application/caching)

### Advanced Routing Patterns

#### ✅ Parallel Routes

```typescript
// ✅ GOOD - Parallel routes for conditional layouts
// app/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <>
      {children}
      {analytics}
      {team}
    </>
  );
}

// app/@analytics/page.tsx
export default function Analytics() {
  return <div>Analytics Dashboard</div>;
}

// app/@team/page.tsx
export default function Team() {
  return <div>Team Members</div>;
}
```

**Key Points:**
- Use `@slot` naming convention for parallel routes
- All slots render simultaneously
- Use `default.tsx` for unmatched routes
- Combine with `@modal` for complex layouts

**Reference:** [Next.js Parallel Routes](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)

#### ✅ Intercepting Routes

```typescript
// ✅ GOOD - Intercept routes for modals
// app/(.)chats/[id]/page.tsx - intercepts /chats/[id]
import { Modal } from '@/components/modal';
import ChatView from '@/components/chat-view';

export default function ChatModal({ params }: { params: { id: string } }) {
  return (
    <Modal>
      <ChatView id={params.id} />
    </Modal>
  );
}

// app/chats/[id]/page.tsx - full page route
export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatView id={params.id} />;
}
```

**Conventions:**
- `(.)` - same level (e.g., `(.)chats/[id]`)
- `(..)` - one level up
- `(..)(..)` - two levels up
- `(...)` - from root `app` directory

**Key Points:**
- Intercepts client-side navigation
- Maintains URL state
- Works with browser back/forward
- Use for modals, drawers, overlays

**Reference:** [Next.js Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)

#### ✅ next/image Optimization

```typescript
// ✅ GOOD - Optimize images with next/image
import Image from 'next/image';

function HeroSection() {
  return (
    <Image
      src="/hero-image.jpg"
      alt="Hero image"
      width={1920}
      height={1080}
      priority // For above-the-fold images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..." // Base64-encoded 10x10px image
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={90}
    />
  );
}

// ✅ GOOD - External images with domain configuration
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/images/**',
      },
    ],
  },
};

// Usage
<Image
  src="https://example.com/images/photo.jpg"
  alt="Photo"
  width={500}
  height={300}
  placeholder="blur"
  blurDataURL="..."
/>
```

**Key Points:**
- `priority` for above-the-fold images (lazy loading disabled)
- `placeholder="blur"` with `blurDataURL` for smooth loading
- `sizes` for responsive images
- Configure `remotePatterns` for external images
- Automatic WebP/AVIF format conversion
- Automatic width/height to prevent layout shift

**Reference:** [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image)

### Modal & Lightbox Components

#### ✅ Proper Modal Structure

```typescript
// ✅ GOOD - Correct modal structure with proper z-index and layout
{isModalOpen && (
  <div 
    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200"
    onClick={() => setIsModalOpen(false)}
  >
    {/* Close button in top-right */}
    <div className="absolute top-4 right-4 z-20">
      <button
        onClick={() => setIsModalOpen(false)}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-sm"
        aria-label="Close modal"
      >
        <X size={24} />
      </button>
    </div>
    
    {/* Content area with flex-1 for proper centering */}
    <div 
      className="flex-1 flex items-center justify-center p-4 relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal content */}
      <img 
        src={imageUrl}
        alt="Image"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300"
      />
    </div>
  </div>
)}
```

**Key Points:**
- Use `fixed inset-0` for full-screen overlay
- Use `z-[100]` or higher for proper layering (above other content)
- Use `flex flex-col` on outer container
- Use `flex-1 flex items-center justify-center` on content container for centering
- Always use `stopPropagation()` on clickable content to prevent backdrop clicks
- Use `bg-black/95` or `bg-black/80` for backdrop opacity
- Use `backdrop-blur-xl` for blur effect
- Block body scroll when modal is open: `document.body.style.overflow = 'hidden'`
- Restore scroll on close: `document.body.style.overflow = 'unset'`

#### ✅ Modal with ESC Key Support

```typescript
// ✅ GOOD - ESC key support for closing modal
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isModalOpen) {
      setIsModalOpen(false);
    }
  };

  if (isModalOpen) {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
  }

  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = 'unset';
  };
}, [isModalOpen]);
```

#### ❌ Common Modal Mistakes

```typescript
// ❌ BAD - Missing flex-1, content won't center properly
<div className="fixed inset-0 flex items-center justify-center">
  <div className="w-full h-full"> {/* Missing flex-1 */}
    <img src="..." />
  </div>
</div>

// ❌ BAD - Wrong z-index (too low)
<div className="fixed inset-0 z-10"> {/* Should be z-[100] or higher */}

// ❌ BAD - No stopPropagation, clicking content closes modal
<div onClick={closeModal}>
  <img onClick={closeModal} /> {/* Should stopPropagation */}
</div>

// ❌ BAD - Missing backdrop blur
<div className="fixed inset-0 bg-black/80"> {/* Add backdrop-blur-xl */}
```

**Reference:** [ImagesPage Lightbox Implementation](src/components/features/images/ImagesPage.tsx)

---

## 📤 File Upload & Image Handling

### Supabase Storage Upload

#### ✅ Upload with Validation

```typescript
// ✅ GOOD - Validate before upload
const uploadImage = async (file: File) => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (2MB limit)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must be less than 2MB');
  }

  // Upload to Supabase Storage
  const fileName = `${userId}/${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  // Store metadata in database
  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  await supabase.from('images').insert({
    url: publicUrl,
    path: fileName,
    mime_type: file.type,
    size: file.size,
  });
};
```

#### ✅ Download External Image and Upload

```typescript
// ✅ GOOD - Download external image and upload to Storage
const uploadExternalImage = async (imageUrl: string) => {
  // Download image
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Failed to fetch image');

  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());

  // Validate size
  if (buffer.length > 2 * 1024 * 1024) {
    throw new Error('Image too large (max 2MB)');
  }

  // Upload to Storage
  const fileName = `${userId}/${Date.now()}_image.jpg`;
  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, buffer, {
      contentType: blob.type,
      upsert: false,
    });

  if (error) throw error;

  // Get public URL and store metadata
  const { data: { publicUrl } } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  return { url: publicUrl, path: fileName };
};
```

### File Size Limits

#### ✅ Recommended Limits

- **Avatars:** 1MB (small profile pictures)
- **Images:** 2MB (content images)
- **Global limit:** Set in Supabase Dashboard (50MB default)

**References:**
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [File Upload Restrictions](https://supabase.com/docs/guides/troubleshooting/upload-file-size-restrictions)

---

## 🌐 Chrome Extension Best Practices

**Reference:** [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)

### Storage

#### ✅ Use chrome.storage.local (NOT localStorage)

```javascript
// ✅ GOOD - Extension storage
chrome.storage.local.set({ key: value }, () => {
  // Callback
});

// ❌ BAD - Never use localStorage in extension
localStorage.setItem('key', 'value'); // NEVER!
```

**Why:** `chrome.storage.local` is:
- Isolated from web page contexts
- Synchronizable across devices (with `chrome.storage.sync`)
- Has better quota limits
- Works in service workers

**Reference:** [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

### Content Scripts

#### ✅ Size Limits

- **Total extension size:** < 25KB (excluding icons)
- **Background JS:** < 5KB
- **Content script JS:** < 8KB

#### ✅ Manifest V3 Compliance

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "webRequest"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ]
}
```

### API Interception

#### ✅ Use webRequest API

```javascript
// ✅ GOOD - Intercept API calls
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Handle request
  },
  { urls: ['https://chatgpt.com/backend-api/*'] },
  ['requestBody']
);
```

**Note:** Requires `webRequest` permission in manifest.json

**Reference:** [Chrome Web Request API](https://developer.chrome.com/docs/extensions/reference/webRequest/)

### Service Worker Best Practices

#### ✅ Handle Service Worker Lifecycle

```javascript
// ✅ GOOD - Service worker with proper lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install
    chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Updated to version', chrome.runtime.getManifest().version);
  }
});

// ✅ GOOD - Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  // Connection keeps service worker alive
  port.onDisconnect.addListener(() => {
    // Cleanup if needed
  });
});
```

**Reference:** [Chrome Service Workers](https://developer.chrome.com/docs/extensions/mv3/service_workers/)

### Content Scripts Best Practices

#### ✅ Use document_idle for Better Performance

```json
{
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "js": ["content.js"],
    "run_at": "document_idle" // ✅ GOOD - Runs after DOM is ready
  }]
}
```

**Run Times:**
- `document_start`: Before DOM construction
- `document_end`: After DOM is ready (default)
- `document_idle`: After DOM and resources loaded (best for most cases)

**Reference:** [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### ChromeDriver for Testing

#### ✅ Use ChromeDriver for E2E Testing

```typescript
// ✅ GOOD - ChromeDriver for automated testing
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(new chrome.Options().addArguments('--headless'))
  .build();

await driver.get('https://example.com');
const element = await driver.findElement(By.id('test'));
await driver.quit();
```

**Reference:** [ChromeDriver Documentation](https://developer.chrome.com/docs/chromedriver/)

### Baseline for Browser Support

#### ✅ Check Browser Support with Baseline

```typescript
// ✅ GOOD - Check feature support
if ('startViewTransition' in document) {
  // View Transition API is supported
  document.startViewTransition(() => updateView());
} else {
  // Fallback for unsupported browsers
  updateView();
}
```

**Reference:** [Baseline](https://web.dev/baseline/) - Check browser support for web features

### Debugging Extensions

#### ✅ Use Chrome DevTools for Extension Debugging

1. **Service Worker Debugging:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "service worker" link under your extension

2. **Content Script Debugging:**
   - Open DevTools on the page where content script runs
   - Content script console appears in DevTools

3. **Popup Debugging:**
   - Right-click extension icon → "Inspect popup"

**Reference:** [Chrome DevTools for Extensions](https://developer.chrome.com/docs/devtools/)

---

## 🧪 Testing Best Practices (Playwright)

### Page Object Model

**Reference:** [Playwright Documentation](https://playwright.dev/)

#### ✅ Implement Page Object Model

```typescript
// ✅ GOOD - Page Object Model for maintainability
import { test, expect } from '@playwright/test';

class PlaywrightDevPage {
  constructor(private page: Page) {
    this.tocList = page.locator('.toc-list');
  }

  async goto() {
    await this.page.goto('https://playwright.dev');
  }

  async getStarted() {
    await this.page.getByRole('link', { name: 'Get started' }).click();
  }
}

test('getting started should contain table of contents', async ({ page }) => {
  const playwrightDev = new PlaywrightDevPage(page);
  await playwrightDev.goto();
  await playwrightDev.getStarted();
  await expect(playwrightDev.tocList).toHaveText([
    'How to install Playwright',
    "What's Installed",
    // ... more items
  ]);
});
```

### Best Practices

#### ✅ Use Web-First Assertions

```typescript
// ✅ GOOD - Web-first assertions with auto-waiting
await expect(page.getByRole('button')).toBeVisible();
await expect(page.getByText('Success')).toHaveText('Operation completed');

// ❌ BAD - Avoid manual waits
await page.waitForTimeout(1000); // Don't use fixed timeouts
```

#### ✅ Use Locators

```typescript
// ✅ GOOD - Use locators (auto-waiting)
const button = page.getByRole('button', { name: 'Submit' });
await button.click();

// ❌ BAD - Avoid direct selectors when possible
await page.click('button.submit'); // Less reliable
```

**References:**
- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## ♿ Accessibility (a11y) Best Practices

### ARIA Attributes

**Reference:** [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

#### ✅ Use aria-label for Links

```html
<!-- ✅ GOOD - Descriptive accessible name -->
<a href="poor.html" aria-label="Read more about Insufficient link names">
  Read more
</a>
```

#### ✅ Use aria-labelledby

```html
<!-- ✅ GOOD - Combine link text with heading -->
<h4 id="poor">Insufficient Link Names Invade Community</h4>
<p>
  Citizens are reeling...
  <a href="poor.html" aria-labelledby="generic poor">
    <span id="generic">More...</span>
  </a>
</p>
```

#### ✅ Accessible Form Labels

```html
<!-- ✅ GOOD - Form with accessible name -->
<form aria-labelledby="search-label">
  <label for="product-search" id="search-label">Search</label>
  <input id="product-search" placeholder="title, author, or ISBN" type="text">
  <button type="submit">Find Books</button>
</form>
```

#### ✅ Interactive Elements with ARIA

```html
<!-- ✅ GOOD - Div as button with keyboard support -->
<div
  role="button"
  tabindex="0"
  aria-label="Do Something"
  onclick="handleClick()"
  onkeydown="handleKeyDown(event)"
>
  Do Something
</div>
```

### Keyboard Navigation

#### ✅ Ensure Keyboard Accessibility

```typescript
// ✅ GOOD - Handle keyboard events
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
};
```

### Screen Reader Support

#### ✅ Use aria-live for Dynamic Content

```html
<!-- ✅ GOOD - Announce dynamic changes -->
<div aria-live="polite">
  <div id="message">Hello, world!</div>
</div>
```

**References:**
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Accessibility](https://react.dev/reference/react-dom/components#accessibility)

---

## 📱 PWA Best Practices

### next-pwa Configuration

**Reference:** [next-pwa Documentation](https://github.com/ducanhgh/next-pwa)

#### ✅ Basic Configuration

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Disable in dev
  register: true,
  scope: '/',
  sw: 'service-worker.js',
});

module.exports = withPWA({
  // Your Next.js config
});
```

#### ✅ Offline Fallbacks

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  fallbacks: {
    document: '/~offline', // Offline page
    data: '/fallback.json',
    image: '/fallback.webp',
    audio: '/fallback.mp3',
    video: '/fallback.mp4',
    font: '/fallback-font.woff2',
  },
});
```

#### ✅ Runtime Caching

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.example\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
        },
      },
    ],
  },
});
```

#### ✅ Advanced Options

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontendNav: true, // Cache on navigation
  aggressiveFrontEndNavCaching: true, // Cache CSS/JS on nav
  cacheStartUrl: true,
  dynamicStartUrl: true, // If start URL changes based on auth
  reloadOnOnline: true, // Reload when back online
});
```

**References:**
- [next-pwa](https://github.com/ducanhgh/next-pwa)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

## 🔍 SEO Best Practices

**Reference:** [Google Search Central Documentation](https://developers.google.com/search/docs)

### Next.js Metadata API

#### ✅ Use Next.js Metadata for SEO

```typescript
// ✅ GOOD - Root layout metadata
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BrainBox - AI Chat Organizer',
  description: 'Organize and manage your AI conversations from ChatGPT, Claude, and Gemini',
  keywords: ['AI', 'chat organizer', 'ChatGPT', 'Claude', 'Gemini'],
  authors: [{ name: 'BrainBox Team' }],
  openGraph: {
    title: 'BrainBox - AI Chat Organizer',
    description: 'Organize and manage your AI conversations',
    type: 'website',
    url: 'https://brainbox-alpha.vercel.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BrainBox - AI Chat Organizer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BrainBox - AI Chat Organizer',
    description: 'Organize and manage your AI conversations',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
```

#### ✅ Dynamic Metadata for Pages

```typescript
// ✅ GOOD - Generate metadata dynamically
export async function generateMetadata({ params }: { params: { id: string } }) {
  const folder = await getFolder(params.id);
  
  return {
    title: `${folder.name} | BrainBox`,
    description: `View and manage conversations in ${folder.name}`,
    openGraph: {
      title: folder.name,
      description: `Folder with ${folder.chat_count} conversations`,
    },
  };
}
```

### Structured Data

#### ✅ Add Structured Data (JSON-LD)

```typescript
// ✅ GOOD - Add structured data for better search results
export default function Page() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BrainBox - AI Chat Organizer',
    description: 'Organize and manage your AI conversations',
    url: 'https://brainbox-alpha.vercel.app',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Page content */}
    </>
  );
}
```

**Reference:** [Structured Data](https://developers.google.com/search/docs/appearance/structured-data)

### Sitemap & Robots.txt

#### ✅ Generate Sitemap for Next.js

```typescript
// ✅ GOOD - app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://brainbox-alpha.vercel.app';
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/chats`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/folders`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/download`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
```

#### ✅ Generate Robots.txt

```typescript
// ✅ GOOD - app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/_next/'],
      },
    ],
    sitemap: 'https://brainbox-alpha.vercel.app/sitemap.xml',
  };
}
```

### JavaScript SEO

#### ✅ Ensure Content is Crawlable

```typescript
// ✅ GOOD - Server-side rendering for SEO
export default async function Page() {
  // Data fetched on server - visible to crawlers
  const data = await fetchData();
  
  return <div>{data}</div>;
}

// ❌ BAD - Client-only content (not crawlable)
'use client';
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchData().then(setData); // Not visible to crawlers
  }, []);
  return <div>{data}</div>;
}
```

**Reference:** [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

### Core Web Vitals for SEO

#### ✅ Optimize Core Web Vitals

**Key Metrics:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**How to Improve:**
1. Optimize images (use Next.js Image component)
2. Minimize JavaScript bundle size
3. Use font-display: swap for web fonts
4. Avoid layout shifts (set image dimensions)
5. Preload critical resources

**Reference:** [Core Web Vitals](https://developers.google.com/search/docs/appearance/page-experience)

### AI SEO Considerations

#### ✅ Content Quality for AI Search

**Best Practices:**
1. **Semantic HTML:** Use proper heading hierarchy (h1 → h2 → h3)
2. **Clear Structure:** Organize content with proper sections
3. **Contextual Keywords:** Use natural language, not keyword stuffing
4. **User Intent:** Focus on answering user questions
5. **Fresh Content:** Regularly update content
6. **Internal Linking:** Link related pages together

**Reference:** [AI SEO Guide](https://www.paulteitelman.com/the-ultimate-ai-seo-guide/)

### Meta Tags

#### ✅ Essential Meta Tags

```typescript
// ✅ GOOD - Complete meta tags
export const metadata: Metadata = {
  title: 'BrainBox - AI Chat Organizer',
  description: 'Organize and manage your AI conversations',
  keywords: ['AI', 'chat organizer', 'productivity'],
  authors: [{ name: 'BrainBox' }],
  creator: 'BrainBox Team',
  publisher: 'BrainBox',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://brainbox-alpha.vercel.app'),
  alternates: {
    canonical: '/',
  },
};
```

**Reference:** [Meta Tags](https://developers.google.com/search/docs/appearance/snippet)

### Search Console

#### ✅ Submit to Google Search Console

1. Verify ownership of your domain
2. Submit sitemap: `https://brainbox-alpha.vercel.app/sitemap.xml`
3. Monitor search performance
4. Fix crawl errors
5. Track Core Web Vitals

**Reference:** [Search Console](https://developers.google.com/search/docs/appearance/google-search-console)

### Baseline Browser Support

#### ✅ Check Feature Support with Baseline

```typescript
// ✅ GOOD - Check browser support before using features
function checkFeatureSupport() {
  const features = {
    viewTransition: 'startViewTransition' in document,
    navigation: 'navigation' in window,
    speculationRules: HTMLScriptElement.supports?.('speculationrules') ?? false,
    webgpu: 'gpu' in navigator,
  };
  
  return features;
}
```

**Reference:** [Baseline](https://web.dev/baseline/) - Check which web features are widely supported

---

## 🔒 Security Best Practices

### Environment Variables

#### ✅ Never Commit Secrets

```bash
# ✅ GOOD - .gitignore includes
.env
.env.local
*.key
*.secret
```

#### ✅ Use Environment Variables

```typescript
// ✅ GOOD - Environment variables
const apiKey = process.env.GEMINI_API_KEY;

// ❌ BAD - Hardcoded secrets
const apiKey = 'AIzaSy...'; // NEVER!
```

### Authentication

#### ✅ Always Verify User

```typescript
// ✅ GOOD - Always check authentication
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new NextResponse('Unauthorized', { status: 401 });
}
```

#### ✅ User-Specific Queries

```typescript
// ✅ GOOD - Always filter by user_id
const { data } = await supabase
  .from('chats')
  .select('*')
  .eq('user_id', user.id); // ALWAYS filter by user
```

### Input Validation

#### ✅ Use Zod for Validation

```typescript
// ✅ GOOD - Validate input
const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
});

const result = schema.parse(requestBody);
```

---

## ⚡ Performance Optimization

**Reference:** [Chrome Performance Best Practices](https://developer.chrome.com/docs/devtools/performance/)

### API Response Times

- **Target:** < 500ms for API responses
- **Page load:** < 2s
- **Bundle size:** < 250KB main bundle

### Lighthouse Audits

#### ✅ Run Regular Performance Audits

```bash
# ✅ GOOD - Run Lighthouse audits
npx lighthouse https://brainbox-alpha.vercel.app --view

# Or use Chrome DevTools:
# 1. Open DevTools → Lighthouse tab
# 2. Select categories (Performance, Accessibility, SEO, Best Practices)
# 3. Click "Analyze page load"
```

**Key Metrics:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **FCP (First Contentful Paint):** < 1.8s
- **TTI (Time to Interactive):** < 3.8s

**Reference:** [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)

### Database Queries

#### ✅ Optimize RLS Policies

```sql
-- ✅ GOOD - Use subquery for better performance
USING (user_id = (SELECT auth.uid()));
```

#### ✅ Use Indexes

```sql
-- ✅ GOOD - Index on frequently queried columns
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
```

### Frontend Optimization

#### ✅ Code Splitting

```typescript
// ✅ GOOD - Lazy load components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
});
```

#### ✅ Memoization

```typescript
// ✅ GOOD - Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

---

## 🛡️ Error Handling

### API Error Handling

```typescript
// ✅ GOOD - Comprehensive error handling
try {
  // Operation
} catch (error: any) {
  // Specific error types
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Validation Error' }, { status: 400 });
  }
  if (error?.status === 429) {
    return NextResponse.json({ error: 'Quota Exceeded' }, { status: 429 });
  }
  // Generic error
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
```

### Client-Side Error Handling

```typescript
// ✅ GOOD - User-friendly error messages
try {
  await operation();
} catch (error: any) {
  if (error?.message?.includes('API Key')) {
    setError('API key not configured');
  } else if (error?.message?.includes('quota')) {
    setError('API quota exceeded. Please try again later.');
  } else {
    setError('An unexpected error occurred');
  }
}
```

### Never Silent Failures

```typescript
// ❌ BAD - Silent failure
try {
  localStorage.setItem('key', 'value');
} catch {
  // Silent failure - BAD!
}

// ✅ GOOD - Log and handle
try {
  localStorage.setItem('key', 'value');
} catch (error) {
  console.warn('Failed to save to localStorage:', error);
  // App continues to work
}
```

### Error Recovery Patterns

#### ✅ Error Boundary with Recovery

```typescript
// ✅ GOOD - Error boundary with reset functionality
'use client';

import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state
        window.location.reload();
      }}
      onError={(error, errorInfo) => {
        // Log to error tracking service
        console.error('Error caught:', error, errorInfo);
      }}
    >
      <MyApp />
    </ErrorBoundary>
  );
}
```

#### ✅ Global Error Handling

```typescript
// ✅ GOOD - Global error handler for unhandled errors
'use client';

useEffect(() => {
  const handleError = (event: ErrorEvent) => {
    console.error('Global error:', event.error);
    // Send to error tracking service
    if (typeof window !== 'undefined' && window.errorTracking) {
      window.errorTracking.captureException(event.error);
    }
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Send to error tracking service
    if (typeof window !== 'undefined' && window.errorTracking) {
      window.errorTracking.captureException(event.reason);
    }
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}, []);
```

#### ✅ Sentry Integration

```typescript
// ✅ GOOD - Sentry setup for Next.js
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
});

// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Usage in components
try {
  // Risky operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { section: 'checkout' },
    extra: { userId: user.id },
  });
  throw error;
}
```

**Reference:** [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## ⚡ Rate Limiting & Throttling

**Reference:** [BrainBox Rate Limiter Implementation](extension/lib/rate-limiter.js)

### Token Bucket Algorithm

#### ✅ Implement Rate Limiter with Token Bucket

```javascript
// ✅ GOOD - Token bucket rate limiter
export class RateLimiter {
  constructor(options = {}) {
    this.tokens = options.maxTokens || 10;
    this.maxTokens = options.maxTokens || 10;
    this.refillRate = options.refillRate || 1; // tokens per second
    this.lastRefill = Date.now();
    this.queue = [];
    this.processing = false;
    this.minDelay = options.minDelay || 0;
    this.maxDelay = options.maxDelay || 0;
  }

  async schedule(fn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority, timestamp: Date.now() });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.refill();
      if (this.tokens < 1) {
        const waitTime = (1 / this.refillRate) * 1000;
        await this.delay(waitTime);
        continue;
      }

      this.tokens -= 1;
      const item = this.queue.shift();

      // Add human-like jitter
      const jitter = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
      if (jitter > 0) await this.delay(jitter);

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

### Platform-Specific Rate Limits

#### ✅ Configure Rate Limits Per Platform

```javascript
// ✅ GOOD - Different rate limits for different platforms
export const limiters = {
  chatgpt: new RateLimiter({ 
    maxTokens: 5, 
    refillRate: 0.5, // 1 req/2s
    minDelay: 2127, 
    maxDelay: 5341 
  }),
  claude: new RateLimiter({ 
    maxTokens: 3, 
    refillRate: 0.2, // Slower
    minDelay: 2413, 
    maxDelay: 6897 
  }),
  gemini: new RateLimiter({ 
    maxTokens: 3, 
    refillRate: 0.5, // 1 req/2s
    minDelay: 2000, 
    maxDelay: 3000 
  }),
  dashboard: new RateLimiter({ 
    maxTokens: 20, 
    refillRate: 5, // Fast for own backend
    minDelay: 127, 
    maxDelay: 347 
  })
};
```

### Exponential Backoff

#### ✅ Implement Exponential Backoff for Errors

```typescript
// ✅ GOOD - Exponential backoff on rate limit errors
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Reference:** [Extension Technical Specification](docs/project/extension_technical_specification.md#queue_implementation)

---

## 📊 Monitoring & Logging

**Reference:** [Extension Performance Monitoring](docs/project/extension_technical_specification.md#performance_monitoring)

### Performance Metrics

#### ✅ Track Key Performance Metrics

```typescript
// ✅ GOOD - Track API request duration
const startTime = performance.now();
try {
  const response = await fetch(url);
  const duration = performance.now() - startTime;
  
  // Log slow requests
  if (duration > 5000) {
    console.warn(`Slow request: ${duration}ms`, url);
  }
  
  return response;
} catch (error) {
  const duration = performance.now() - startTime;
  console.error(`Request failed after ${duration}ms:`, error);
  throw error;
}
```

#### ✅ Monitor Memory Usage

```javascript
// ✅ GOOD - Monitor memory in Chrome extension
if (chrome.system?.memory) {
  chrome.system.memory.getInfo((info) => {
    const usedMB = (info.availableCapacity / 1024 / 1024).toFixed(2);
    if (usedMB > 100) {
      console.warn(`High memory usage: ${usedMB}MB`);
    }
  });
}
```

### Error Tracking

#### ✅ Structured Error Logging

```typescript
// ✅ GOOD - Structured error logging
function logError(error: Error, context: Record<string, any>) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  };
  
  // Send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // sendToErrorTracking(errorLog);
  } else {
    console.error('Error:', errorLog);
  }
}
```

### Performance Thresholds

#### ✅ Define Performance Thresholds

```typescript
// ✅ GOOD - Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  maxRequestDuration: 5000, // 5 seconds
  maxMemoryUsage: 100, // 100 MB
  maxErrorRate: 0.05, // 5%
};

function checkPerformance(metrics: PerformanceMetrics) {
  if (metrics.requestDuration > PERFORMANCE_THRESHOLDS.maxRequestDuration) {
    console.warn('Slow requests detected');
    // Notify user or disable auto-features
  }
  
  if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.maxMemoryUsage) {
    console.warn('High memory usage');
    // Trigger garbage collection
  }
  
  if (metrics.errorRate > PERFORMANCE_THRESHOLDS.maxErrorRate) {
    console.warn('High error rate');
    // Disable auto-features
  }
}
```

**Reference:** [Extension Test Report - Performance Metrics](docs/project/EXTENSION_TEST_REPORT.md#performance-metrics-summary)

### Web Vitals Monitoring

#### ✅ Track Core Web Vitals

```typescript
// ✅ GOOD - Monitor Core Web Vitals
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify(metric);
  
  // Send to your analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}

// Track all Core Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

**Core Web Vitals:**
- **LCP (Largest Contentful Paint)**: < 2.5s (good), < 4.0s (needs improvement)
- **FID (First Input Delay)**: < 100ms (good), < 300ms (needs improvement)
- **CLS (Cumulative Layout Shift)**: < 0.1 (good), < 0.25 (needs improvement)

**Reference:** [Web Vitals](https://web.dev/vitals/)

### Performance Budgets

#### ✅ Define Performance Budgets

```typescript
// ✅ GOOD - Performance budget configuration
// .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
  },
};
```

**Reference:** [Performance Budgets](https://web.dev/performance-budgets-101/)

### Memory Leak Detection

#### ✅ Monitor Memory Usage

```typescript
// ✅ GOOD - Detect memory leaks
function useMemoryMonitor() {
  useEffect(() => {
    if (typeof performance === 'undefined' || !performance.memory) {
      return;
    }

    const interval = setInterval(() => {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usedMB = (usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (jsHeapSizeLimit / 1024 / 1024).toFixed(2);

      console.log(`Memory: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`);

      // Alert if memory usage is high
      if (usedMB / limitMB > 0.9) {
        console.warn('High memory usage detected!');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);
}
```

### Performance Profiling

#### ✅ Chrome DevTools Profiling

```typescript
// ✅ GOOD - Performance profiling helpers
function startProfiling(label: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${label}-start`);
  }
}

function endProfiling(label: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
  }
}

// Usage
startProfiling('data-fetch');
await fetchData();
endProfiling('data-fetch');
```

**Reference:** [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

---

## 💾 Caching Strategies

### Next.js Cache Tags

#### ✅ Use Cache Tags for Invalidation

```typescript
// ✅ GOOD - Cache with tags for targeted invalidation
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async () => {
    return await fetchData();
  },
  ['data-key'],
  {
    tags: ['chats', 'user-data'],
    revalidate: 3600, // 1 hour
  }
);

// Later: Invalidate specific tags
import { revalidateTag } from 'next/cache';
revalidateTag('chats'); // Only invalidate chats cache
```

### Stale-While-Revalidate

#### ✅ Implement Stale-While-Revalidate Pattern

```typescript
// ✅ GOOD - Serve stale data while revalidating
export async function GET() {
  const cached = await getCachedData();
  
  // Revalidate in background
  revalidateTag('chats');
  
  return NextResponse.json(cached);
}
```

### Browser Caching Headers

#### ✅ Set Appropriate Cache Headers

```typescript
// ✅ GOOD - Cache headers for static assets
return new NextResponse(data, {
  headers: {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year for static assets
  },
});

// ✅ GOOD - Cache headers for API responses
return new NextResponse(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // 1 min cache, 5 min stale
  },
});
```

**Reference:** [Next.js Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)

---

## 📦 Bundle Optimization

### Tree Shaking

#### ✅ Enable Tree Shaking

```json
// ✅ GOOD - package.json sideEffects
{
  "sideEffects": false, // Enable tree shaking
  "sideEffects": [
    "*.css", // CSS files have side effects
    "./src/polyfills.js"
  ]
}
```

### Dynamic Imports

#### ✅ Use Dynamic Imports for Code Splitting

```typescript
// ✅ GOOD - Dynamic import for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false, // Disable SSR if not needed
});

// ✅ GOOD - Dynamic import with named export
const { Chart } = await import('./Chart');
```

### Bundle Analysis

#### ✅ Analyze Bundle Size

```bash
# ✅ GOOD - Analyze bundle with @next/bundle-analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});

# Run analysis
ANALYZE=true npm run build
```

### Dependency Optimization

#### ✅ Optimize Dependencies

```typescript
// ✅ GOOD - Import only what you need
import { debounce } from 'lodash-es'; // Tree-shakeable
// ❌ BAD
import _ from 'lodash'; // Imports entire library

// ✅ GOOD - Use lighter alternatives
import { z } from 'zod'; // Lightweight validation
// Instead of heavy validation libraries
```

**Reference:** [Next.js Bundle Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/bundling)

---

## 🔄 API Versioning

**Reference:** [GitHub REST API Versioning](https://docs.github.com/en/rest/overview/api-versions)

**Reference:** [GitHub REST API Versioning](https://docs.github.com/en/rest/overview/api-versions)

### URL Versioning

#### ✅ Version in URL Path

```typescript
// ✅ GOOD - Version in URL path
// /api/v1/chats
// /api/v2/chats

export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const version = pathname.split('/')[2]; // Extract 'v1' or 'v2'
  
  if (version === 'v1') {
    // Legacy API logic
    return NextResponse.json({ data: legacyFormat });
  } else if (version === 'v2') {
    // New API logic
    return NextResponse.json({ data: newFormat });
  }
}
```

### Header Versioning

#### ✅ Version in Accept Header

```typescript
// ✅ GOOD - Version in Accept header
export async function GET(request: NextRequest) {
  const acceptHeader = request.headers.get('Accept');
  const version = acceptHeader?.match(/version=(\d+)/)?.[1] || '1';
  
  if (version === '1') {
    return NextResponse.json({ data: v1Format });
  } else if (version === '2') {
    return NextResponse.json({ data: v2Format });
  }
}
```

### Backward Compatibility

#### ✅ Maintain Backward Compatibility

```typescript
// ✅ GOOD - Support multiple versions
export async function GET(request: NextRequest) {
  const version = getApiVersion(request);
  
  const data = await fetchData();
  
  // Transform data based on version
  if (version === '1') {
    return NextResponse.json({
      chats: data.chats,
      total: data.total,
    });
  } else if (version === '2') {
    return NextResponse.json({
      items: data.chats,
      pagination: {
        total: data.total,
        page: data.page,
      },
    });
  }
}
```

### Deprecation Strategy

#### ✅ Deprecate Old Versions Gracefully

```typescript
// ✅ GOOD - Deprecation headers
export async function GET(request: NextRequest) {
  const version = getApiVersion(request);
  
  if (version === '1') {
    return NextResponse.json(
      { data: v1Data },
      {
        headers: {
          'X-API-Version': '1',
          'X-API-Deprecated': 'true',
          'X-API-Sunset': '2025-12-31',
          'Link': '</api/v2/chats>; rel="successor-version"',
        },
      }
    );
  }
}
```

**References:**
- [GitHub REST API Versioning](https://docs.github.com/en/rest/overview/api-versions)
- [Postman API Platform](https://www.postman.com/api-platform/)
- [Treblle API Documentation](https://docs.treblle.com/)

---

## 🌍 Internationalization (i18n)

**Reference:** [React i18next Documentation](https://react.i18next.com/)

### Next.js i18n Setup

#### ✅ Configure Next.js for i18n

```typescript
// ✅ GOOD - next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'bg', 'de'],
    defaultLocale: 'en',
    localeDetection: true,
  },
};
```

### React i18next Integration

#### ✅ Setup React i18next

```typescript
// ✅ GOOD - i18n configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        welcome: 'Welcome',
        chats: 'Chats',
        folders: 'Folders',
      },
    },
    bg: {
      translation: {
        welcome: 'Добре дошли',
        chats: 'Чатове',
        folders: 'Папки',
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});
```

### Chrome Extension i18n

#### ✅ Use Chrome i18n API

```javascript
// ✅ GOOD - Chrome extension i18n
// manifest.json
{
  "default_locale": "en"
}

// _locales/en/messages.json
{
  "appName": {
    "message": "BrainBox - AI Chat Organizer"
  },
  "saveChat": {
    "message": "Save Chat"
  }
}

// Usage in extension
const appName = chrome.i18n.getMessage('appName');
const saveButton = chrome.i18n.getMessage('saveChat');
```

### Dynamic Language Switching

#### ✅ Implement Language Switcher

```typescript
// ✅ GOOD - Language switcher component
'use client';

import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // Save preference
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('language', lng);
      } catch (error) {
        console.warn('Failed to save language preference');
      }
    }
  };

  return (
    <select value={i18n.language} onChange={(e) => changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="bg">Български</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
```

### Date and Number Formatting

#### ✅ Format Dates and Numbers by Locale

```typescript
// ✅ GOOD - Locale-aware formatting
import { useTranslation } from 'react-i18next';

export function FormattedDate({ date }: { date: Date }) {
  const { i18n } = useTranslation();
  
  return (
    <span>
      {new Intl.DateTimeFormat(i18n.language, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date)}
    </span>
  );
}

export function FormattedNumber({ value }: { value: number }) {
  const { i18n } = useTranslation();
  
  return (
    <span>
      {new Intl.NumberFormat(i18n.language).format(value)}
    </span>
  );
}
```

**References:**
- [Chrome Extensions i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [i18next Documentation](https://www.i18next.com/)
- [React i18next Documentation](https://react.i18next.com/)

---

## 🔔 Webhooks & Event Handling

**Reference:** [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)

### Webhook Security

#### ✅ Verify Webhook Signatures

```typescript
// ✅ GOOD - Verify webhook signature
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('X-Hub-Signature-256');
  const secret = process.env.WEBHOOK_SECRET!;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const providedSignature = signature?.replace('sha256=', '');

  if (providedSignature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  // Process webhook
  return NextResponse.json({ received: true });
}
```

### Webhook Event Handling

#### ✅ Handle Different Event Types

```typescript
// ✅ GOOD - Handle multiple event types
export async function POST(request: NextRequest) {
  const payload = await request.json();
  const eventType = request.headers.get('X-Event-Type');

  switch (eventType) {
    case 'chat.created':
      await handleChatCreated(payload);
      break;
    case 'chat.updated':
      await handleChatUpdated(payload);
      break;
    case 'chat.deleted':
      await handleChatDeleted(payload);
      break;
    default:
      console.warn('Unknown event type:', eventType);
  }

  return NextResponse.json({ received: true });
}
```

### Webhook Retry Strategy

#### ✅ Implement Idempotent Webhooks

```typescript
// ✅ GOOD - Idempotent webhook handling
const processedEvents = new Set<string>();

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const eventId = payload.id || request.headers.get('X-Event-ID');

  // Check if already processed
  if (eventId && processedEvents.has(eventId)) {
    return NextResponse.json({ message: 'Already processed' }, { status: 200 });
  }

  try {
    await processWebhook(payload);
    if (eventId) processedEvents.add(eventId);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Return error so webhook provider can retry
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
```

### Webhook Testing

#### ✅ Test Webhooks Locally

```typescript
// ✅ GOOD - Webhook testing endpoint
export async function POST(request: NextRequest) {
  // In development, allow testing without signature
  if (process.env.NODE_ENV === 'development') {
    const payload = await request.json();
    console.log('Webhook received:', payload);
    return NextResponse.json({ received: true, test: true });
  }

  // Production: verify signature
  return handleWebhook(request);
}
```

**References:**
- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
- [Webhook.site - Testing Tool](https://docs.webhook.site/)

---

## 🚫 Всичко забранено (Prohibited Practices)

### ⚠️ Критични забрани

#### ❌ localStorage без проверки

```typescript
// ❌ BAD - Няма проверка за window
localStorage.getItem('key');

// ❌ BAD - Няма try-catch
localStorage.setItem('key', 'value');

// ❌ BAD - Директен достъп
window.localStorage.getItem('key');
```

**✅ Правилно:**
```typescript
if (typeof window !== 'undefined') {
  try {
    localStorage.setItem('key', 'value');
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'SecurityError') {
        console.warn('localStorage access denied');
      }
    }
  }
}
```

#### ❌ Hardcoded API ключове и secrets

```typescript
// ❌ BAD - Hardcoded API key
const apiKey = 'AIzaSy...'; // NEVER!

// ❌ BAD - Client-side API key storage
const apiKey = localStorage.getItem('apiKey'); // NEVER!

// ❌ BAD - Hardcoded passwords
const password = 'secret123'; // NEVER!
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Environment variables
const apiKey = process.env.GEMINI_API_KEY;
```

**Пример от проекта:**
```438:444:src/lib/services/ai.ts
const getClient = (apiKeyOverride?: string) => {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found');
  }
  return new GoogleGenerativeAI(apiKey);
};
```

#### ❌ TypeScript 'any' типове

```typescript
// ❌ BAD - Using 'any'
function process(data: any) { }
const result: any = await fetchData();

// ❌ BAD - Type assertions без проверка
const user = data as User;
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Proper types
function process(data: UserData) { }
const result: UserData = await fetchData();

// ✅ GOOD - Type guards
function isUser(data: unknown): data is User {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'email' in data;
}
```

**Пример от проекта:**
```1:54:src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

export const createClient = () => {
  let rememberMe = false;
  if (typeof window !== 'undefined') {
    try {
      rememberMe = localStorage.getItem('brainbox_remember_me') === 'true';
    } catch (error) {
      // localStorage access denied (e.g., in iframe with different origin)
      console.warn('Failed to read remember me from localStorage:', error);
      rememberMe = false;
    }
  }
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined;
          const cookies = document.cookie.split(';');
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
          return cookie ? cookie.split('=')[1] : undefined;
        },
        set(name: string, value: string, options: { maxAge?: number; path?: string; domain?: string; sameSite?: string; secure?: boolean } = {}) {
          if (typeof document === 'undefined') return;
          
          // If remember me is enabled, set longer expiry (30 days)
          if (rememberMe && name.includes('auth-token')) {
            options.maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
          }
          
          let cookieString = `${name}=${value}`;
          if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
          if (options.path) cookieString += `; path=${options.path}`;
          if (options.domain) cookieString += `; domain=${options.domain}`;
          if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
          if (options.secure) cookieString += `; secure`;
          
          document.cookie = cookieString;
        },
        remove(name: string, options: { path?: string; domain?: string } = {}) {
          if (typeof document === 'undefined') return;
          let cookieString = `${name}=; max-age=0`;
          if (options.path) cookieString += `; path=${options.path}`;
          if (options.domain) cookieString += `; domain=${options.domain}`;
          document.cookie = cookieString;
        },
      },
    }
  );
};
```

#### ❌ localStorage в Chrome Extension

```javascript
// ❌ BAD - Never use localStorage in extension
localStorage.setItem('key', 'value'); // NEVER!
```

**✅ Правилно:**
```javascript
// ✅ GOOD - Use chrome.storage.local
chrome.storage.local.set({ key: 'value' }, () => {
  // Callback
});
```

#### ❌ console.log в production код

```typescript
// ❌ BAD - Verbose logging in production
console.log('User data:', userData);
console.log('API response:', response);

// ❌ BAD - Debug logs in API routes
console.log('[API] Processing request...');
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Only error logging
console.error('[API] Error:', error);

// ✅ GOOD - Conditional logging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}
```

**Пример от проекта:**
```135:140:src/app/api/folders/route.ts
console.error('[API /folders] Database error:', error);
return NextResponse.json(
  { error: 'Failed to fetch folders' },
  { status: 500 }
);
} catch (error) {
console.error('[API /folders] Error:', error);
```

#### ❌ Без error handling в async операции

```typescript
// ❌ BAD - No error handling
const data = await fetch('/api/data');
const result = await data.json();

// ❌ BAD - Silent failures
try {
  await saveData();
} catch (error) {
  // Silent failure - BAD!
}
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Proper error handling
try {
  const data = await fetch('/api/data');
  if (!data.ok) throw new Error('Request failed');
  const result = await data.json();
} catch (error) {
  console.error('Failed to fetch data:', error);
  // Handle error appropriately
}
```

#### ❌ Без проверка за authentication в API routes

```typescript
// ❌ BAD - No auth check
export async function POST(request: Request) {
  const body = await request.json();
  await saveToDatabase(body); // No user check!
}
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Always verify user
export async function POST(request: Request) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Proceed with authenticated request
}
```

**Пример от проекта:**
```15:52:src/app/api/folders/route.ts
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  // If Authorization header exists, use it (for extension)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const accessToken = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );
    return await supabase.auth.getUser();
  }
  
  // Otherwise use cookies (for web app)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  return await supabase.auth.getUser();
}
```

#### ❌ Без валидация на input данни

```typescript
// ❌ BAD - No validation
export async function POST(request: Request) {
  const body = await request.json();
  await saveToDatabase(body); // No validation!
}
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Validate with Zod
const schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validated = schema.parse(body);
  await saveToDatabase(validated);
}
```

**Пример от проекта:**
```5:12:src/app/api/ai/generate/route.ts
const requestSchema = z.object({
  content: z.string().min(1),
  apiKey: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string()
  })).optional(),
  systemInstruction: z.string().optional(),
});
```

#### ❌ Tailwind динамични класове без проверка

```typescript
// ❌ BAD - Dynamic class construction doesn't work
const className = `text-${color}-500`; // Won't work!
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Use complete class names
const colorClasses = {
  red: 'text-red-500',
  blue: 'text-blue-500',
};
const className = colorClasses[color];
```

#### ❌ Без loading states при data fetching

```typescript
// ❌ BAD - No loading state
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(setData);
}, []);
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Loading states
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
useEffect(() => {
  fetchData()
    .then(setData)
    .finally(() => setIsLoading(false));
}, []);
```

#### ❌ Без RLS policies в Supabase

```sql
-- ❌ BAD - No RLS enabled
CREATE TABLE chats (
  id uuid PRIMARY KEY,
  user_id uuid,
  content text
);
-- No RLS policies!
```

**✅ Правилно:**
```sql
-- ✅ GOOD - RLS enabled with policies
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own chats"
ON chats FOR SELECT
USING (auth.uid() = user_id);
```

#### ❌ Без проверка за browser support

```typescript
// ❌ BAD - No feature detection
document.startViewTransition(() => updateView());
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Check feature support
if ('startViewTransition' in document) {
  document.startViewTransition(() => updateView());
} else {
  updateView(); // Fallback
}
```

#### ❌ Без cleanup в useEffect

```typescript
// ❌ BAD - No cleanup
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);
}, []);
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Cleanup function
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

#### ❌ Без passive event listeners

```javascript
// ❌ BAD - Blocks scrolling
window.addEventListener('scroll', scrollHandler);
```

**✅ Правилно:**
```javascript
// ✅ GOOD - Passive listener
window.addEventListener('scroll', scrollHandler, { 
  passive: true 
});
```

#### ❌ Без проверка за window в SSR

```typescript
// ❌ BAD - Will fail in SSR
const width = window.innerWidth;
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Check for window
const width = typeof window !== 'undefined' ? window.innerWidth : 0;
```

#### ❌ Без webhook signature verification

```typescript
// ❌ BAD - No signature verification
export async function POST(request: Request) {
  const payload = await request.json();
  await processWebhook(payload); // No verification!
}
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Verify signature
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('X-Hub-Signature-256');
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const payload = JSON.parse(body);
  await processWebhook(payload);
}
```

#### ❌ Без rate limiting

```typescript
// ❌ BAD - No rate limiting
export async function POST(request: Request) {
  await processRequest(); // No limits!
}
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  await processRequest();
}
```

#### ❌ Без idempotency в webhooks

```typescript
// ❌ BAD - No idempotency check
export async function POST(request: Request) {
  const payload = await request.json();
  await processWebhook(payload); // May process twice!
}
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Idempotency key
export async function POST(request: Request) {
  const payload = await request.json();
  const idempotencyKey = request.headers.get('Idempotency-Key');
  
  if (idempotencyKey) {
    const processed = await checkIfProcessed(idempotencyKey);
    if (processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    await markAsProcessed(idempotencyKey);
  }
  
  await processWebhook(payload);
}
```

#### ❌ Без проверка за размер на файлове

```typescript
// ❌ BAD - No file size check
const formData = new FormData();
formData.append('file', file);
await uploadFile(formData); // No size limit!
```

**✅ Правилно:**
```typescript
// ✅ GOOD - File size validation
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
if (file.size > MAX_SIZE) {
  throw new Error('File too large (max 2MB)');
}
await uploadFile(formData);
```

**Пример от проекта:**
```77:92:src/app/api/avatar/upload/route.ts
// Validate file type
if (!file.type.startsWith('image/')) {
  return NextResponse.json(
    { error: 'File must be an image' },
    { status: 400, headers: corsHeaders }
  );
}

// Validate file size (max 1MB)
const maxSize = 1 * 1024 * 1024; // 1MB
if (file.size > maxSize) {
  return NextResponse.json(
    { error: 'File size must be less than 1MB' },
    { status: 400, headers: corsHeaders }
  );
}
```

#### ❌ Без проверка за MIME type

```typescript
// ❌ BAD - No MIME type check
const formData = new FormData();
formData.append('file', file);
await uploadFile(formData); // No type check!
```

**✅ Правилно:**
```typescript
// ✅ GOOD - MIME type validation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
await uploadFile(formData);
```

**Пример от проекта:**
```77:83:src/app/api/avatar/upload/route.ts
// Validate file type
if (!file.type.startsWith('image/')) {
  return NextResponse.json(
    { error: 'File must be an image' },
    { status: 400, headers: corsHeaders }
  );
}
```

#### ❌ Без проверка за дублирани заявки

```typescript
// ❌ BAD - No duplicate check
const handleSubmit = async () => {
  await saveData(); // May submit twice!
};
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Prevent duplicate submissions
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
    await saveData();
  } finally {
    setIsSubmitting(false);
  }
};
```

**Пример от проекта:**
```73:180:src/components/features/chats/ChatStudio.tsx
const handleSend = async (e?: React.FormEvent) => {
  e?.preventDefault();
  if (!input.trim() || isLoading) return; // Prevent duplicate submissions

  const userText = input;
  setInput('');
  const newHistory = [...messages, { role: 'user' as const, text: userText }];
  setMessages(newHistory);
  setIsLoading(true); // Set loading state

  let fullResponse = '';
  
  try {
    // ... API call logic ...
  } catch (error: any) {
    console.error('Chat error:', error);
    // Error handling
  } finally {
    setIsLoading(false); // Always reset loading state
  }
};
```

#### ❌ Без проверка за quota в localStorage

```typescript
// ❌ BAD - No quota check
localStorage.setItem('largeData', JSON.stringify(hugeObject));
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Handle quota exceeded
try {
  localStorage.setItem('data', JSON.stringify(data));
} catch (error) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    console.warn('localStorage quota exceeded');
    // Clear old data or use alternative storage
  }
}
```

#### ❌ Без проверка за dark mode support

```typescript
// ❌ BAD - No dark mode check
const isDark = true; // Hardcoded!
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Use next-themes
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
const isDark = theme === 'dark';
```

#### ❌ Без проверка за mobile responsiveness

```typescript
// ❌ BAD - No mobile check
const width = 1024; // Hardcoded!
```

**✅ Правилно:**
```typescript
// ✅ GOOD - Responsive design
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

#### ❌ Без проверка за extension context

```javascript
// ❌ BAD - No extension check
chrome.storage.local.set({ key: 'value' }); // May fail in web context!
```

**✅ Правилно:**
```javascript
// ✅ GOOD - Check extension context
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.set({ key: 'value' });
}
```

#### ❌ Без проверка за service worker availability

```javascript
// ❌ BAD - No service worker check
navigator.serviceWorker.register('/sw.js');
```

**✅ Правилно:**
```javascript
// ✅ GOOD - Check service worker support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 📘 TypeScript Best Practices

### Type Safety

#### ✅ No 'any' Types

```typescript
// ❌ BAD - Using 'any'
function process(data: any) { }

// ✅ GOOD - Proper types
function process(data: UserData) { }
```

#### ✅ Use Strict Mode

```json
// ✅ GOOD - tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### Type Definitions

#### ✅ Generate Database Types

```bash
# ✅ GOOD - Generate types from Supabase
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
```

#### ✅ Use Type Guards

```typescript
// ✅ GOOD - Type guards
function isUser(data: unknown): data is User {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'email' in data;
}
```

---

## 🚀 Modern JavaScript/TypeScript Patterns

### TypeScript 5.8+ Features

#### ✅ Improved Type Narrowing

```typescript
// ✅ GOOD - TypeScript 5.8+ improved narrowing
function process(data: string | number) {
  if (typeof data === 'string') {
    // TypeScript knows data is string here
    return data.toUpperCase();
  }
  // TypeScript knows data is number here
  return data.toFixed(2);
}

// ✅ GOOD - Control flow analysis
function validate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function processValue(value: unknown) {
  if (validate(value)) {
    // TypeScript narrows to string
    console.log(value.length);
  }
}
```

#### ✅ Template Literal Types

```typescript
// ✅ GOOD - Template literal types for type-safe strings
type Route = `/api/${string}`;
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ApiEndpoint = `${Method} ${Route}`;

const endpoint: ApiEndpoint = 'GET /api/chats'; // ✅ Valid
// const invalid: ApiEndpoint = 'PATCH /api/chats'; // ❌ Error
```

**Reference:** [TypeScript 5.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)

### ES2024/2025 Features

#### ✅ Array.findLast and Array.findLastIndex

```typescript
// ✅ GOOD - Find last matching element
const numbers = [1, 2, 3, 4, 5];
const lastEven = numbers.findLast(n => n % 2 === 0); // 4
const lastEvenIndex = numbers.findLastIndex(n => n % 2 === 0); // 3

// ✅ GOOD - Useful for finding latest item
const chats = await fetchChats();
const lastUnreadChat = chats.findLast(chat => !chat.read);
```

#### ✅ Object.groupBy (ES2024)

```typescript
// ✅ GOOD - Group array elements by key
const chats = [
  { id: 1, folder: 'work' },
  { id: 2, folder: 'personal' },
  { id: 3, folder: 'work' },
];

const grouped = Object.groupBy(chats, chat => chat.folder);
// { work: [{ id: 1 }, { id: 3 }], personal: [{ id: 2 }] }
```

**Reference:** [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

### Generator Functions

#### ✅ Generator for Lazy Sequences

```typescript
// ✅ GOOD - Generator for ID sequence
function* idGenerator() {
  let id = 0;
  while (true) {
    yield id++;
  }
}

const ids = idGenerator();
console.log(ids.next().value); // 0
console.log(ids.next().value); // 1

// ✅ GOOD - Generator for pagination
function* paginate<T>(items: T[], pageSize: number) {
  for (let i = 0; i < items.length; i += pageSize) {
    yield items.slice(i, i + pageSize);
  }
}

const chats = [...Array(100).keys()];
for (const page of paginate(chats, 10)) {
  // Process page of 10 items
  console.log(page);
}
```

#### ✅ Async Generators

```typescript
// ✅ GOOD - Async generator for streaming data
async function* fetchChatsStream() {
  let page = 1;
  while (true) {
    const response = await fetch(`/api/chats?page=${page}`);
    const data = await response.json();
    
    if (data.chats.length === 0) break;
    
    yield* data.chats;
    page++;
  }
}

// Usage
for await (const chat of fetchChatsStream()) {
  console.log(chat);
}
```

### Module Patterns

#### ✅ ES Modules Best Practices

```typescript
// ✅ GOOD - Named exports for better tree-shaking
export function processChat(chat: Chat) { }
export function validateChat(chat: Chat) { }

// ✅ GOOD - Re-export pattern
export { processChat, validateChat } from './chat-utils';
export type { Chat, ChatMetadata } from './types';

// ✅ GOOD - Dynamic imports for code splitting
async function loadChatEditor() {
  const { ChatEditor } = await import('./chat-editor');
  return ChatEditor;
}
```

**Reference:** [MDN ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

---

## 📖 Additional Resources

### Official Documentation

- **DOM Living Standard:** https://dom.spec.whatwg.org/
- **React Documentation:** https://react.dev/
- **Zustand Documentation:** https://docs.pmnd.rs/zustand/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **React Hook Form:** https://react-hook-form.com/
- **Google Cloud Documentation:** https://docs.cloud.google.com/
- **Google Cloud API Keys:** https://docs.cloud.google.com/docs/authentication/api-keys-use#node.js
- **Supabase Documentation:** https://supabase.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Playwright Documentation:** https://playwright.dev/
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG22/quickref/
- **Chrome for Developers:** https://developer.chrome.com/docs
- **Chrome Web Platform:** https://developer.chrome.com/docs/web-platform/
- **Chrome Performance:** https://developer.chrome.com/docs/performance/
- **Chrome Extension Docs:** https://developer.chrome.com/docs/extensions/
- **Chrome DevTools:** https://developer.chrome.com/docs/devtools/
- **Lighthouse:** https://developer.chrome.com/docs/lighthouse/
- **Workbox:** https://developer.chrome.com/docs/workbox/
- **Chrome Capabilities:** https://developer.chrome.com/docs/capabilities/
- **Chrome Privacy & Security:** https://developer.chrome.com/docs/privacy-sandbox/
- **Chrome CSS & UI:** https://developer.chrome.com/docs/css-ui/
- **Chrome Identity:** https://developer.chrome.com/docs/identity/
- **Chrome Payments:** https://developer.chrome.com/docs/payments/
- **Chrome AI:** https://developer.chrome.com/docs/ai/
- **Chrome WebGPU:** https://developer.chrome.com/docs/web-platform/webgpu/
- **Chrome Origin Trials:** https://developer.chrome.com/docs/origin-trials/
- **Chrome Web Store:** https://developer.chrome.com/docs/webstore/
- **ChromeDriver:** https://developer.chrome.com/docs/chromedriver/
- **Baseline:** https://web.dev/baseline/
- **Google Search Central:** https://developers.google.com/search/docs
- **AI SEO Guide:** https://www.paulteitelman.com/the-ultimate-ai-seo-guide/
- **GitHub REST API:** https://docs.github.com/en/rest
- **Postman API Platform:** https://www.postman.com/api-platform/
- **Treblle API Documentation:** https://docs.treblle.com/
- **Chrome Extensions i18n:** https://developer.chrome.com/docs/extensions/reference/api/i18n
- **i18next:** https://www.i18next.com/
- **React i18next:** https://react.i18next.com/
- **GitHub Webhooks:** https://docs.github.com/en/webhooks
- **Webhook.site:** https://docs.webhook.site/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

### Web Standards

- **Web.dev - Forms Autofill:** https://web.dev/learn/forms/autofill/
- **MDN Web Docs:** https://developer.mozilla.org/

### Project-Specific

- **BrainBox Dashboard:** https://brainbox-alpha.vercel.app
- **Extension Test Environment:** `dev/test-chrome.sh`

---

## 🎯 Quick Reference Checklist

### Before Writing Code

- [ ] Check if localStorage access needs try-catch
- [ ] Verify API keys are server-side only
- [ ] Ensure RLS policies are enabled
- [ ] Validate all user input with Zod
- [ ] Check authentication in API routes
- [ ] Use proper TypeScript types (no 'any')
- [ ] Add error handling for all async operations

### Before Committing

- [ ] No hardcoded secrets
- [ ] No 'any' types
- [ ] All localStorage operations have try-catch
- [ ] All API routes check authentication
- [ ] All database queries filter by user_id
- [ ] TypeScript compilation passes
- [ ] ESLint passes

---

**Last Updated:** 2025-01-15  
**Maintained By:** AI Agent System  
**Version:** 1.0.0

