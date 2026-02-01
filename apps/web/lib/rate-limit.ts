import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Redis is configured
const isRedisConfigured =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// Create Redis client only if configured
const redis = isRedisConfigured
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

// Mock rate limiter for local development (always allows requests)
const mockRateLimiter = {
  limit: async (_identifier: string) => ({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }),
};

// 10 requests per minute (sliding window)
export const minuteRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "ratelimit:minute",
    })
  : mockRateLimiter;

// 100 requests per day (fixed window)
export const dailyRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(100, "1 d"),
      prefix: "ratelimit:daily",
    })
  : mockRateLimiter;
