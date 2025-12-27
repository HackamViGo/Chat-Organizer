// BrainBox - Rate Limiting & Queue System
// Implements token bucket algorithm with "humanized" jitter

export class RateLimiter {
    constructor(options = {}) {
        this.tokens = options.maxTokens || 10;
        this.maxTokens = options.maxTokens || 10;
        this.refillRate = options.refillRate || 0.2; // tokens per second
        this.lastRefill = Date.now();
        this.queue = [];
        this.processing = false;

        // "Human" settings
        this.minDelay = options.minDelay || 1137;
        this.maxDelay = options.maxDelay || 3219;
    }

    // Add request to queue
    async schedule(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                fn,
                resolve,
                reject,
                priority, // Higher number = higher priority
                timestamp: Date.now()
            });

            // Sort by priority then timestamp
            this.queue.sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return a.timestamp - b.timestamp;
            });

            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            this.refill();

            if (this.tokens < 1) {
                // Wait for next token
                const waitTime = (1 / this.refillRate) * 1000;
                await this.delay(waitTime);
                continue;
            }

            // Consume token
            this.tokens -= 1;

            // Get next item
            const item = this.queue.shift();

            try {
                // Add "human" random delay before execution
                const jitter = Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
                if (jitter > 0) await this.delay(jitter);

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

        if (elapsed > 0) {
            const newTokens = elapsed * this.refillRate;
            this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global limiters per platform
export const limiters = {
    chatgpt: new RateLimiter({ maxTokens: 5, refillRate: 0.5, minDelay: 2127, maxDelay: 5341 }), // ~1 req/2s, max 5 burst
    claude: new RateLimiter({ maxTokens: 3, refillRate: 0.2, minDelay: 2413, maxDelay: 6897 }),  // Slower for Claude
    gemini: new RateLimiter({ maxTokens: 5, refillRate: 0.5, minDelay: 2817, maxDelay: 4729 }),
    dashboard: new RateLimiter({ maxTokens: 20, refillRate: 5, minDelay: 127, maxDelay: 347 })   // Fast for our own backend
};
