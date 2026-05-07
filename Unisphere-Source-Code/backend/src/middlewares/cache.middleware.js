const cache = new Map();

/**
 * simpleCache Middleware
 * Caches GET requests for a specified duration.
 * Best for: Public lists, discovery data, and metadata.
 */
export const simpleCache = (durationInSeconds = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse && Date.now() < cachedResponse.expiry) {
      console.log(`[CACHE_HIT] Serving from cache: ${key}`);
      return res.status(200).json(cachedResponse.data);
    }

    // Override res.json to capture and cache the data
    const originalJson = res.json;
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(key, {
          data,
          expiry: Date.now() + (durationInSeconds * 1000)
        });
      }
      return originalJson.call(res, data);
    };

    next();
  };
};

/**
 * Utility to clear specific cache keys
 */
export const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};
