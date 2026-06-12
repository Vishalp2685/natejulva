import React, { createContext, useContext, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: any;
  expiry: number;
}

interface CachedResponse {
  data: any;
  ok: boolean;
}

export interface Message {
  id: number;
  sender: number;
  sender_name: string;
  receiver: number;
  receiver_name: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

interface CacheContextType {
  cachedFetch: (url: string, options?: RequestInit, ttlMs?: number) => Promise<CachedResponse>;
  hasCachedData: (url: string) => boolean;
  getCachedData: (url: string) => any;
  setCachedData: (url: string, data: any, ttlMs?: number) => void;
  clearCache: () => void;
  invalidateKey: (url: string) => void;
  getChatMessages: (partnerId: number) => Message[];
  setChatMessages: (partnerId: number, messages: Message[]) => void;
  appendChatMessage: (partnerId: number, message: Message) => void;
  appendChatMessages: (partnerId: number, newMessages: Message[]) => void;
  updateChatMessage: (partnerId: number, tempId: number, realMessage: Message) => void;
  removeChatMessage: (partnerId: number, idToRemove: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default TTL is 60 seconds — conservative fallback.
 * Callers (FindMatch, Dashboard) always pass explicit TTLs in milliseconds,
 * so this default is only a safety net.
 *
 * WHY MILLISECONDS EVERYWHERE: The original API accepted `ttlSeconds` and
 * then multiplied by 1000 internally. This created a mismatch: callers in
 * FindMatch and Dashboard passed raw millisecond values (e.g. 10 * 60 * 1000)
 * which were then multiplied again — producing a ~600-hour TTL by accident.
 * The parameter is now `ttlMs` and no multiplication happens inside.
 */
const DEFAULT_TTL_MS = 60_000; // 60 seconds

// ─────────────────────────────────────────────────────────────────────────────
// DEV FLAG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WHY NOT process.env.NODE_ENV:
 *
 * `process` is a Node.js global. It does not exist in browser/Vite
 * environments unless you install @types/node and configure tsconfig.
 * Using it in a frontend file causes TS2591 ("Cannot find name 'process'").
 *
 * The correct Vite-safe approach is import.meta.env.MODE, which is
 * statically replaced at build time — dead-code elimination removes all
 * __DEV__ branches in production with zero runtime cost, exactly like
 * process.env.NODE_ENV === 'development' would in a CRA/webpack build.
 *
 * The typeof guard makes this safe in any environment (jest, SSR, etc.)
 * where import.meta may not be defined.
 */
const __DEV__: boolean =
  typeof import.meta !== 'undefined'
    ? (import.meta as any).env?.MODE === 'development'
    : false;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — defined at module scope; never recreated
// ─────────────────────────────────────────────────────────────────────────────

/** Sort messages by timestamp ascending — extracted to avoid inline allocation */
function sortByTimestamp(a: Message, b: Message): number {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /**
   * WHY useRef FOR CACHE STORES: Cache mutations must never trigger re-renders.
   * useRef gives us a mutable container that is stable across renders. A
   * useState would cause every cache write (including background preloads) to
   * re-render the entire app tree — catastrophic for performance.
   */
  const cache = useRef<Record<string, CacheEntry>>({});
  const chatCache = useRef<Record<number, Message[]>>({});

  /**
   * WHY in-flight MAP: The original had no deduplication at the context level.
   * If two components called cachedFetch for the same URL simultaneously
   * (e.g. FindMatch preloading page 2 while IntersectionObserver also fires),
   * two real network requests went out. This map stores a Promise per URL so
   * the second caller simply awaits the same in-flight Promise.
   *
   * This is "request coalescing" — the single most impactful API call
   * reduction available at the infrastructure level.
   */
  const inFlight = useRef<Record<string, Promise<CachedResponse>>>({});

  // ─── Cache management ────────────────────────────────────────────────────

  /**
   * WHY useCallback ON ALL CONTEXT METHODS: Every consumer of useCache()
   * destructures these functions. Without useCallback, a new function
   * reference is created each time CacheProvider renders (rare, but possible
   * if parent state changes). Stable references mean:
   * - useCallback deps in consumers don't fire spuriously
   * - React.memo children with these functions as props don't re-render
   */
  const clearCache = useCallback(() => {
    cache.current = {};
    chatCache.current = {};
    inFlight.current = {};
  }, []);

  const invalidateKey = useCallback((url: string) => {
    delete cache.current[url];
    // Also cancel any in-flight request for this URL so the next
    // call gets fresh data rather than the stale in-flight result.
    delete inFlight.current[url];
  }, []);

  const hasCachedData = useCallback((url: string): boolean => {
    const cached = cache.current[url];
    return !!(cached && cached.expiry > Date.now());
  }, []);

  const getCachedData = useCallback((url: string): any => {
    const cached = cache.current[url];
    if (cached && cached.expiry > Date.now()) return cached.data;
    return null;
  }, []);

  /**
   * setCachedData — write a value directly into the cache with a TTL.
   *
   * WHY THIS EXISTS:
   * After AuthContext.updateProfile() saves a profile edit, both the
   * AuthContext state AND the CacheContext ref need to reflect the new data.
   * Without this, a page that calls getCachedData('/api/profiles/me/') would
   * return the stale pre-edit value until the TTL expires naturally.
   *
   * Usage in AuthContext:
   *   updateProfile(newProfile) {
   *     setProfile(newProfile);                         // update state
   *     setCachedData(PROFILE_URL, newProfile, TTL_MS); // update cache
   *   }
   *
   * This is a synchronous ref write — it never triggers a re-render.
   */
  const setCachedData = useCallback((
    url: string,
    data: any,
    ttlMs: number = DEFAULT_TTL_MS,
  ): void => {
    cache.current[url] = { data, expiry: Date.now() + ttlMs };
  }, []);

  // ─── Core fetch ──────────────────────────────────────────────────────────

  const cachedFetch = useCallback(
    async (url: string, options?: RequestInit, ttlMs: number = DEFAULT_TTL_MS): Promise<CachedResponse> => {
      const method = (options?.method ?? 'GET').toUpperCase();

      // ── POST / PUT / DELETE ──────────────────────────────────────────────
      if (method !== 'GET') {
        /**
         * WHY TARGETED INVALIDATION, NOT NUCLEAR CLEAR:
         *
         * BEFORE: Every POST to any /api/profiles/ endpoint wiped ALL profile
         * cache keys. So liking a profile from the Dashboard invalidated the
         * FindMatch search results, the recommendations cache, the profile/me
         * cache — everything. The user's next page visit would cold-fetch all
         * of it, defeating the entire caching strategy.
         *
         * AFTER: We invalidate only URLs that are semantically stale after a
         * mutation. A "like" POST makes the recommendations and the specific
         * profile stale (liked_by_me flipped), but NOT search results that
         * don't include like state, and NOT profile/me which is about the
         * current user's own data.
         */
        const urlObj = (() => { try { return new URL(url); } catch { return null; } })();
        const path = urlObj?.pathname ?? url;

        const keysToInvalidate: string[] = [];

        if (path.includes('/profiles/like/')) {
          Object.keys(cache.current).forEach((key) => {
            if (
              key.includes('/profiles/recommendations/') ||
              key.includes('/profiles/likes-sent/') ||
              key.includes('/profiles/chat/conversations/')
            ) {
              keysToInvalidate.push(key);
            }
          });
        } else if (path.includes('/profiles/unmatch/')) {
          Object.keys(cache.current).forEach((key) => {
            if (
              key.includes('/profiles/recommendations/') ||
              key.includes('/profiles/likes-sent/') ||
              key.includes('/profiles/chat/conversations/')
            ) {
              keysToInvalidate.push(key);
            }
          });
        } else if (path.includes('/profiles/reject/')) {
          Object.keys(cache.current).forEach((key) => {
            if (
              key.includes('/profiles/likes-received/') ||
              key.includes('/profiles/recommendations/')
            ) {
              keysToInvalidate.push(key);
            }
          });
        } else if (path.includes('/profiles/me/') || path.match(/\/profiles\/\d+\/$/)) {
          keysToInvalidate.push(url);
          Object.keys(cache.current).forEach((key) => {
            if (key.includes('/profiles/recommendations/')) {
              keysToInvalidate.push(key);
            }
          });
        } else {
          Object.keys(cache.current).forEach((key) => {
            if (key.includes('/api/profiles/') && !key.includes('/chat/')) {
              keysToInvalidate.push(key);
            }
          });
        }

        keysToInvalidate.forEach((key) => {
          delete cache.current[key];
          delete inFlight.current[key];
        });

        try {
          const response = await fetch(url, options);
          
          if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }

          const text = await response.text();
          const data = text ? JSON.parse(text) : null;
          return { data, ok: response.ok };
        } catch (err) {
          console.error(`[CacheContext] Mutation request failed: ${url}`, err);
          return { data: null, ok: false };
        }
      }

      // ── GET: cache check ─────────────────────────────────────────────────
      const now = Date.now();
      const cached = cache.current[url];
      if (cached && cached.expiry > now) {
        // FIX 1 — was: process.env.NODE_ENV === 'development'
        // process is a Node.js global unavailable in Vite browser bundles.
        // __DEV__ uses import.meta.env.MODE which Vite statically replaces
        // at build time, so this branch is completely eliminated in production.
        if (__DEV__) {
          console.log(`%c[Cache Hit] ${url}`, 'color: #10B981; font-weight: bold;');
        }
        return { data: cached.data, ok: true };
      }

      // ── GET: request coalescing ───────────────────────────────────────────
      /**
       * FIX 2 — was: if (inFlight.current[url])
       *
       * TypeScript error TS2801: "This condition will always return true since
       * this 'Promise<CachedResponse>' is always defined."
       *
       * WHY THIS HAPPENS:
       * inFlight.current[url] is typed as Promise<CachedResponse> (never null).
       * TypeScript correctly points out that a Promise object is always truthy
       * — you cannot falsy-check an object type. The intended check is whether
       * the KEY exists in the map, not whether the value is truthy.
       *
       * FIX: use the `in` operator, which checks key presence regardless of
       * value type. This is also semantically more correct — we want to know
       * "is there an entry for this URL", not "is the Promise truthy".
       */
      if (url in inFlight.current) {
        // FIX 3 — same process.env → __DEV__ replacement
        if (__DEV__) {
          console.log(`%c[Cache Coalesced] ${url}`, 'color: #F59E0B; font-weight: bold;');
        }
        return inFlight.current[url];
      }

      // FIX 4 — same process.env → __DEV__ replacement
      if (__DEV__) {
        console.log(`%c[Cache Miss] ${url}`, 'color: #EF4444; font-weight: bold;');
      }

      // ── GET: network request ──────────────────────────────────────────────
      /**
       * WHY STORE PROMISE BEFORE AWAIT: We register the Promise in inFlight
       * BEFORE awaiting it. This is the critical ordering — if we awaited first
       * and THEN stored the result, there would be a window between the fetch
       * start and the registration where a concurrent call would bypass
       * coalescing and fire a duplicate request.
       */
      const fetchPromise: Promise<CachedResponse> = (async () => {
        try {
          const response = await fetch(url, options);

          if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }

          const text = await response.text();
          const data = text ? JSON.parse(text) : null;

          if (response.ok && data !== null) {
            cache.current[url] = { data, expiry: now + ttlMs };
          }

          return { data, ok: response.ok };
        } catch (err) {
          console.error(`[CacheContext] GET request failed: ${url}`, err);
          return { data: null, ok: false };
        } finally {
          // Always clean up in-flight entry so future calls after this
          // request's TTL expires will make a fresh network call.
          delete inFlight.current[url];
        }
      })();

      inFlight.current[url] = fetchPromise;
      return fetchPromise;
    },
    [] // No deps — only refs are used; refs never cause stale closures
  );

  // ─── Chat cache ───────────────────────────────────────────────────────────

  const getChatMessages = useCallback((partnerId: number): Message[] => {
    return chatCache.current[partnerId] ?? [];
  }, []);

  const setChatMessages = useCallback((partnerId: number, messages: Message[]) => {
    chatCache.current[partnerId] = messages;
  }, []);

  const appendChatMessage = useCallback((partnerId: number, message: Message) => {
    const current = chatCache.current[partnerId] ?? [];
    if (current.some((m) => m.id === message.id)) return;
    chatCache.current[partnerId] = [...current, message].sort(sortByTimestamp);
  }, []);

  const appendChatMessages = useCallback((partnerId: number, newMessages: Message[]) => {
    if (newMessages.length === 0) return;
    const current = chatCache.current[partnerId] ?? [];
    const existingIds = new Set(current.map((m) => m.id));
    const fresh = newMessages.filter((m) => !existingIds.has(m.id));
    if (fresh.length === 0) return;
    chatCache.current[partnerId] = [...current, ...fresh].sort(sortByTimestamp);
  }, []);

  const updateChatMessage = useCallback(
    (partnerId: number, tempId: number, realMessage: Message) => {
      const current = chatCache.current[partnerId] ?? [];
      chatCache.current[partnerId] = current.map((m) =>
        m.id === tempId ? realMessage : m
      );
    },
    []
  );

  const removeChatMessage = useCallback((partnerId: number, idToRemove: number) => {
    const current = chatCache.current[partnerId] ?? [];
    chatCache.current[partnerId] = current.filter((m) => m.id !== idToRemove);
  }, []);

  // ── Stable context value ─────────────────────────────────────────────────
  /**
   * WHY NOT useMemo FOR contextValue: All methods are already stable
   * useCallback references. Wrapping in useMemo would add one more
   * indirection layer for no benefit. Since callbacks have no deps that
   * change, the object is effectively stable across renders.
   */
  const contextValue: CacheContextType = {
    cachedFetch,
    hasCachedData,
    getCachedData,
    setCachedData,
    clearCache,
    invalidateKey,
    getChatMessages,
    setChatMessages,
    appendChatMessage,
    appendChatMessages,
    updateChatMessage,
    removeChatMessage,
  };

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useCache = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};
