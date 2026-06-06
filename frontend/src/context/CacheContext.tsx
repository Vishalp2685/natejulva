import React, { createContext, useContext, useRef } from 'react';

interface CacheEntry {
  data: any;
  expiry: number;
}

interface CachedResponse {
  data: any;
  ok: boolean;
}

interface CacheContextType {
  cachedFetch: (url: string, options?: RequestInit, ttlSeconds?: number) => Promise<CachedResponse>;
  hasCachedData: (url: string) => boolean;
  getCachedData: (url: string) => any;
  clearCache: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cache = useRef<{ [key: string]: CacheEntry }>({});

  const clearCache = () => {
    cache.current = {};
  };

  const hasCachedData = (url: string): boolean => {
    const now = Date.now();
    const cached = cache.current[url];
    return !!(cached && cached.expiry > now);
  };

  const getCachedData = (url: string): any => {
    const now = Date.now();
    const cached = cache.current[url];
    if (cached && cached.expiry > now) {
      return cached.data;
    }
    return null;
  };

  const cachedFetch = async (url: string, options?: RequestInit, ttlSeconds = 60): Promise<CachedResponse> => {
    const method = options?.method?.toUpperCase() || 'GET';

    if (method !== 'GET') {
      // Mutation request (POST, PUT, DELETE). Invalidate cached read endpoints.
      const keysToClear = Object.keys(cache.current).filter((key) =>
        key.includes('/api/profiles/')
      );

      keysToClear.forEach((key) => {
        delete cache.current[key];
      });

      const response = await fetch(url, options);
      const data = await response.json();
      return { data, ok: response.ok };
    }

    // GET request. Check cache first.
    const now = Date.now();
    const cached = cache.current[url];
    if (cached && cached.expiry > now) {
      console.log(`%c[Cache Hit] ${url}`, 'color: #10B981; font-weight: bold;');
      return { data: cached.data, ok: true };
    }

    console.log(`%c[Cache Miss] ${url}`, 'color: #EF4444; font-weight: bold;');
    // Cache miss. Fetch from server.
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      cache.current[url] = {
        data,
        expiry: now + ttlSeconds * 1000,
      };
    }
    return { data, ok: response.ok };
  };

  return (
    <CacheContext.Provider value={{ cachedFetch, hasCachedData, getCachedData, clearCache }}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};
