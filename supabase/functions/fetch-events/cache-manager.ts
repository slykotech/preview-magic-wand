// Enhanced caching and rate limiting for event fetching

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface RateLimit {
  count: number;
  resetTime: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry>();
const rateLimits = new Map<string, RateLimit>();

// Cache TTL settings (in milliseconds)
const CACHE_SETTINGS = {
  EVENTS: 15 * 60 * 1000, // 15 minutes for events
  GEOCODING: 60 * 60 * 1000, // 1 hour for geocoding
  PLACES: 30 * 60 * 1000, // 30 minutes for places
  FALLBACK: 5 * 60 * 1000 // 5 minutes for fallback data
};

// Rate limit settings
const RATE_LIMITS = {
  GOOGLE: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour
  SCRAPING: { maxRequests: 60, windowMs: 60 * 60 * 1000 }, // 60/hour
  GEOCODING: { maxRequests: 50, windowMs: 60 * 60 * 1000 } // 50/hour
};

export function getCacheKey(
  type: string,
  latitude?: number,
  longitude?: number,
  radius?: number,
  size?: number,
  keyword?: string
): string {
  const parts = [type];
  if (latitude !== undefined) parts.push(latitude.toString());
  if (longitude !== undefined) parts.push(longitude.toString());
  if (radius !== undefined) parts.push(radius.toString());
  if (size !== undefined) parts.push(size.toString());
  if (keyword) parts.push(keyword);
  
  return parts.join('_');
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  console.log(`Cache hit for key: ${key}`);
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlType: keyof typeof CACHE_SETTINGS = 'EVENTS'): void {
  const ttl = CACHE_SETTINGS[ttlType];
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  console.log(`Cached data for key: ${key} (TTL: ${ttl}ms)`);
}

export function isRateLimited(source: string, customLimits?: { maxRequests: number; windowMs: number }): boolean {
  const limits = customLimits || RATE_LIMITS.GOOGLE;
  const now = Date.now();
  const limit = rateLimits.get(source);
  
  if (!limit || now > limit.resetTime) {
    rateLimits.set(source, { count: 1, resetTime: now + limits.windowMs });
    return false;
  }
  
  if (limit.count >= limits.maxRequests) {
    console.log(`Rate limit reached for ${source}: ${limit.count}/${limits.maxRequests}`);
    return true;
  }
  
  limit.count++;
  return false;
}

export function getRemainingRequests(source: string): number {
  const limit = rateLimits.get(source);
  if (!limit) return RATE_LIMITS.GOOGLE.maxRequests;
  
  const now = Date.now();
  if (now > limit.resetTime) return RATE_LIMITS.GOOGLE.maxRequests;
  
  return Math.max(0, RATE_LIMITS.GOOGLE.maxRequests - limit.count);
}

// Clean up expired cache entries
export function cleanupCache(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => cache.delete(key));
  
  if (expiredKeys.length > 0) {
    console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
  }
}

// Get cache statistics
export function getCacheStats(): { size: number; hitRate: number; rateLimitStatus: Record<string, number> } {
  const rateLimitStatus: Record<string, number> = {};
  
  for (const [source, limit] of rateLimits.entries()) {
    const now = Date.now();
    if (now <= limit.resetTime) {
      rateLimitStatus[source] = limit.count;
    } else {
      rateLimitStatus[source] = 0;
    }
  }
  
  return {
    size: cache.size,
    hitRate: 0, // Would need to track hits/misses for this
    rateLimitStatus
  };
}

// Batch cache operations
export function batchCache<T>(entries: Array<{ key: string; data: T; ttlType?: keyof typeof CACHE_SETTINGS }>): void {
  entries.forEach(({ key, data, ttlType = 'EVENTS' }) => {
    setCache(key, data, ttlType);
  });
}

// Cache warming function
export function warmCache(commonLocations: Array<{ lat: number; lng: number; name: string }>): void {
  console.log(`Warming cache for ${commonLocations.length} common locations`);
  // This would pre-populate cache with common location data
  // Implementation would depend on specific use case
}

// Initialize cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 5 * 60 * 1000); // Clean up every 5 minutes
}