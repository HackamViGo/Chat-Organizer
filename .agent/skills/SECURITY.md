# Security Skills for BrainBox

## Authentication Best Practices

### 1. Token Management

```typescript
// ❌ NEVER expose service_role_key in client
const supabase = createClient(url, SERVICE_ROLE_KEY)

// ✅ Use anon_key in client, service_role only in server
const supabase = createClient(url, ANON_KEY)
```

### 2. Token Encryption (Extension)

```typescript
import { webcrypto } from 'crypto'

async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)

  const key = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(process.env.ENCRYPTION_KEY!),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

  return Buffer.concat([iv, new Uint8Array(encrypted)]).toString('base64')
}
```

### 3. Session Validation

```typescript
export async function validateSession(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return { valid: false, user: null }
  }

  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { valid: false, user: null }
  }

  return { valid: true, user }
}
```

## Input Validation

### 1. Zod Schemas (Runtime Validation)

```typescript
import { z } from 'zod'

const createChatSchema = z.object({
  title: z.string().min(1, 'Title required').max(200, 'Title too long').trim(),
  content: z.string().max(50000, 'Content too long'),
  platform: z.enum(['chatgpt', 'claude', 'gemini']),
  url: z.string().url().optional(),
  folder_id: z.string().uuid().optional(),
})

// API Route
export async function POST(req: NextRequest) {
  const body = await req.json()

  const result = createChatSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: result.error.errors },
      { status: 400 }
    )
  }

  // Safe to use result.data
  const chat = await createChat(result.data)
  return NextResponse.json(chat)
}
```

### 2. SQL Injection Prevention

```typescript
// ❌ DANGEROUS (if constructing raw SQL)
const query = `SELECT * FROM chats WHERE user_id = '${userId}'`

// ✅ SAFE (Supabase uses parameterized queries)
const { data } = await supabase.from('chats').select('*').eq('user_id', userId) // Automatically escaped
```

### 3. XSS Prevention

```tsx
import DOMPurify from 'isomorphic-dompurify'

// Sanitize user-generated HTML
function MessageContent({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre'],
    ALLOWED_ATTR: [],
  })

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
}
```

## Rate Limiting

### 1. Server-side (Upstash Redis)

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
})

export async function POST(req: NextRequest) {
  const identifier = req.ip ?? 'anonymous'
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    )
  }

  // Process request
}
```

### 2. Client-side (Token Bucket)

```typescript
class TokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }

  async consume(tokens: number = 1): Promise<boolean> {
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    return false
  }

  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd)
    this.lastRefill = now
  }
}

// Usage in Extension
const bucket = new TokenBucket(10, 1) // 10 tokens, refill 1/sec

async function saveChat(chat: Chat) {
  if (await bucket.consume()) {
    await fetch('/api/chats', { method: 'POST', body: JSON.stringify(chat) })
  } else {
    // Queue for later
    syncQueue.push(chat)
  }
}
```

## Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

## Environment Variables

```bash
# .env.example (PUBLIC)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.local (PRIVATE - never commit)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
ENCRYPTION_KEY=your-32-char-key
```

## Audit Logging

```typescript
// lib/audit-log.ts
export async function logSecurityEvent(event: {
  type: 'auth' | 'data_access' | 'data_modification'
  action: string
  user_id?: string
  ip?: string
  metadata?: Record<string, any>
}) {
  await supabase.from('security_logs').insert({
    ...event,
    timestamp: new Date().toISOString(),
  })
}

// Usage in API route
export async function DELETE(req: NextRequest) {
  const { user } = await validateSession(req)

  await logSecurityEvent({
    type: 'data_modification',
    action: 'chat_deleted',
    user_id: user.id,
    ip: req.ip,
    metadata: { chat_id: chatId },
  })

  // ... delete chat
}
```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
