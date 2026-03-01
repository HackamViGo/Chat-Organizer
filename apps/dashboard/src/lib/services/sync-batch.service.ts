/**
 * SyncBatchService
 * 
 * Centralizes and batches optimistic UI syncs (API calls) to prevent rate limits.
 * Requests with the same debounceId are deduplicated so only the last payload is sent.
 */

type RequestInitMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface QueueItem {
  id: string; // Unique ID for this request in the queue
  url: string;
  method: RequestInitMethod;
  body?: string;
  debounceId: string; // Used to deduplicate similar requests (e.g. updating the same chat ID)
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  retryCount: number;
}

class SyncBatchService {
  private queue: QueueItem[] = []; // Changed from Map to strict FIFO array
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;
  private flushDelayMs: number;

  // Token Bucket Rate Limiting
  private tokens = 30;
  private readonly maxTokens = 30;
  private readonly refillRateMs = 2000; // 1 token every 2 seconds
  private lastRefillTime = Date.now();

  constructor(flushDelayMs = 1500) {
    this.flushDelayMs = flushDelayMs;
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = Math.floor(timePassed / this.refillRateMs);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTime = now;
    }
  }

  /**
   * Enqueue a request. If a request with the same `debounceId` already exists,
   * it replaces the existing request's payload/method but keeps the existing promise
   * context so the caller still gets a resolution.
   */
  async enqueue(url: string, method: RequestInitMethod, body: string | undefined, debounceId: string): Promise<unknown> {
    // 1. SSR Guard
    if (typeof window === 'undefined') {
      console.warn('SyncBatchService: skipped in SSR');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // 2. Conflict Resolution (CREATE + DELETE = cancel)
      // Check for specific CREATE/DELETE cancellation pattern based on debounceId logic if needed.
      // Since it's REST, if a DELETE comes in for an item that has an active POST (CREATE) in the queue:
      const existingIndex = this.queue.findIndex(item => item.debounceId === debounceId);

      if (existingIndex !== -1) {
        const existing = this.queue[existingIndex]!;
        
        // Conflict Resolution: If existing is POST and new is DELETE, cancel both
        if (existing.method === 'POST' && method === 'DELETE') {
          this.queue.splice(existingIndex, 1);
          existing.resolve(null); // Resolve the original POST promise
          resolve(null); // Resolve the DELETE promise
          return;
        }

        // Deduplication: Update existing request network parameters (if not cancelled above)
        existing.url = url;
        existing.method = method;
        existing.body = body;
        
        // Chain the resolution so ALL callers awaiting this debounceId get resolved/rejected
        const oldResolve = existing.resolve;
        const oldReject = existing.reject;
        
        existing.resolve = (val: unknown) => { oldResolve(val); resolve(val); };
        existing.reject = (err: unknown) => { oldReject(err); reject(err); };
      } else {
        // Create new queued item in FIFO array
        this.queue.push({
          id: Math.random().toString(36).substring(7),
          url,
          method,
          body,
          debounceId,
          resolve,
          reject,
          retryCount: 0
        });
      }

      this.scheduleFlush();
    });
  }

  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    // We don't want to interrupt an active flush, but we do want to schedule the next one
    this.flushTimeout = setTimeout(() => {
      this.flushTimeout = null;
      this.flush();
    }, this.flushDelayMs);
  }

  /**
   * Immediately flush the current queue.
   */
  async flush() {
    if (this.isFlushing || this.queue.length === 0) return;
    
    // Offline pause
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.scheduleFlush(); // Retry later when online (naive approach, but sufficient for now)
      return;
    }

    this.isFlushing = true;
    this.refillTokens();
    
    // Process items as long as we have tokens and items
    // Using an array to hold un-processed items if we run out of tokens or get errors
    const requeueItems: QueueItem[] = [];

    while (this.queue.length > 0 && this.tokens > 0) {
      const item = this.queue.shift()!;
      this.tokens--;

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.body ? { 'Content-Type': 'application/json' } : undefined,
          credentials: 'include',
          body: item.body,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.statusText}`);
        }

        // Try to parse JSON, if it's empty or fails, just return null
        let data = null;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
              data = await response.json();
          }
        } catch {
           // ignore JSON parse error
        }

        item.resolve(data);
      } catch (error) {
        // Exponential Backoff Retry Logic
        if (item.retryCount < 3) {
          item.retryCount++;
          // Put it back in the queue to be retried
          requeueItems.push(item);
          // Wait before processing next flush to simulate backoff: 2s, 4s, 8s
          const backoffDelay = Math.pow(2, item.retryCount) * 1000;
          setTimeout(() => this.scheduleFlush(), backoffDelay);
        } else {
          // Reached max retries, final rejection
          console.error(`SyncBatchService: Max retries (3) reached for ${item.debounceId}`, error);
          item.reject(error);
        }
      }
    }

    // Put unused or retried items back into the queue (at the front to preserve rough FIFO order among failures)
    if (requeueItems.length > 0) {
      this.queue.unshift(...requeueItems);
    }

    this.isFlushing = false;
    
    // If new items were added or some were requeued, schedule another flush
    // We also need to schedule if we stopped because of rate limiting (tokens === 0)
    if (this.queue.length > 0 && !this.flushTimeout) {
      if (this.tokens === 0) {
         // Wait for at least one token refill
         setTimeout(() => this.scheduleFlush(), this.refillRateMs);
      } else {
         this.scheduleFlush();
      }
    }
  }

  // Allow clearing for tests
  _clearForTests() {
     this.queue = [];
     if (this.flushTimeout) clearTimeout(this.flushTimeout);
     this.isFlushing = false;
     this.tokens = this.maxTokens;
     this.lastRefillTime = Date.now();
  }
}

export const syncBatchService = new SyncBatchService();
