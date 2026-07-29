// Simple sliding window rate limiter
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitInfo>();

export function rateLimit(
  ip: string,
  limit: number = 100,
  windowMs: number = 60000
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const info = rateLimitMap.get(ip);

  if (!info) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  // Window expired, reset
  if (now > info.resetTime) {
    info.count = 1;
    info.resetTime = now + windowMs;
    return { success: true, limit, remaining: limit - 1, reset: info.resetTime };
  }

  // Within window
  if (info.count >= limit) {
    return { success: false, limit, remaining: 0, reset: info.resetTime };
  }

  info.count += 1;
  return { success: true, limit, remaining: limit - info.count, reset: info.resetTime };
}

// Clean up stale entries periodically to prevent memory leaks in long-running processes
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, info] of rateLimitMap.entries()) {
      if (now > info.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
  
  // Unref if available (Node.js environment)
  if (interval.unref) {
    interval.unref();
  }
}
