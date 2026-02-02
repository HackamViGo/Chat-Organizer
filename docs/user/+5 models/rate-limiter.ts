/**
 * Rate Limiter - Token Bucket Algorithm
 * 
 * Platform-specific rate limits to prevent API abuse
 */

class RateLimiter {
    private capacity: number;
    private tokens: number;
    private windowMs: number;
    private lastRefill: number;
    private queue: Array<{
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
        fn: () => Promise<any>;
    }>;

    constructor(requestsPerMinute: number, windowMs: number = 60000) {
        this.capacity = requestsPerMinute;
        this.tokens = requestsPerMinute;
        this.windowMs = windowMs;
        this.lastRefill = Date.now();
        this.queue = [];
    }

    private refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        
        if (elapsed >= this.windowMs) {
            this.tokens = this.capacity;
            this.lastRefill = now;
        }
    }

    async schedule<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject, fn });
            this.processQueue();
        });
    }

    private async processQueue() {
        while (this.queue.length > 0) {
            this.refill();

            if (this.tokens > 0) {
                const item = this.queue.shift();
                if (!item) break;

                this.tokens--;

                try {
                    const result = await item.fn();
                    item.resolve(result);
                } catch (error) {
                    item.reject(error);
                }
            } else {
                // Wait before next refill
                const waitTime = this.windowMs - (Date.now() - this.lastRefill);
                if (waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
    }
}

// Platform-specific rate limiters
export const limiters = {
    // Original platforms
    chatgpt: new RateLimiter(60, 60000),      // 60 req/min
    claude: new RateLimiter(30, 60000),        // 30 req/min
    gemini: new RateLimiter(20, 60000),        // 20 req/min
    
    // New platforms (2026)
    deepseek: new RateLimiter(40, 60000),      // 40 req/min
    perplexity: new RateLimiter(30, 60000),    // 30 req/min
    grok: new RateLimiter(20, 60000),          // 20 req/min (Twitter rate limits)
    qwen: new RateLimiter(50, 60000),          // 50 req/min
    lmarena: new RateLimiter(10, 60000),       // 10 req/min (Gradio is slow)
    
    // Dashboard API
    dashboard: new RateLimiter(100, 60000)     // 100 req/min
};
