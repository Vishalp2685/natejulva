import React, { createContext, useContext, useRef } from 'react';

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
  cachedFetch: (url: string, options?: RequestInit, ttlSeconds?: number) => Promise<CachedResponse>;
  hasCachedData: (url: string) => boolean;
  getCachedData: (url: string) => any;
  clearCache: () => void;
  invalidateKey: (url: string) => void;
  getChatMessages: (partnerId: number) => Message[];
  setChatMessages: (partnerId: number, messages: Message[]) => void;
  appendChatMessage: (partnerId: number, message: Message) => void;
  appendChatMessages: (partnerId: number, newMessages: Message[]) => void;
  updateChatMessage: (partnerId: number, tempId: number, realMessage: Message) => void;
  removeChatMessage: (partnerId: number, idToRemove: number) => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cache = useRef<{ [key: string]: CacheEntry }>({});
  const chatCache = useRef<{ [partnerId: number]: Message[] }>({});

  const clearCache = () => {
    cache.current = {};
    chatCache.current = {};
  };

  const invalidateKey = (url: string) => {
    delete cache.current[url];
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

  const getChatMessages = (partnerId: number): Message[] => {
    return chatCache.current[partnerId] || [];
  };

  const setChatMessages = (partnerId: number, messages: Message[]) => {
    chatCache.current[partnerId] = messages;
  };

  const appendChatMessage = (partnerId: number, message: Message) => {
    const current = chatCache.current[partnerId] || [];
    if (current.some(m => m.id === message.id)) return;
    chatCache.current[partnerId] = [...current, message].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const appendChatMessages = (partnerId: number, newMessages: Message[]) => {
    if (newMessages.length === 0) return;
    const current = chatCache.current[partnerId] || [];
    const existingIds = new Set(current.map(m => m.id));
    const filteredNew = newMessages.filter(m => !existingIds.has(m.id));
    if (filteredNew.length === 0) return;

    chatCache.current[partnerId] = [...current, ...filteredNew].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const updateChatMessage = (partnerId: number, tempId: number, realMessage: Message) => {
    const current = chatCache.current[partnerId] || [];
    chatCache.current[partnerId] = current.map(m => m.id === tempId ? realMessage : m);
  };

  const removeChatMessage = (partnerId: number, idToRemove: number) => {
    const current = chatCache.current[partnerId] || [];
    chatCache.current[partnerId] = current.filter(m => m.id !== idToRemove);
  };

  const cachedFetch = async (url: string, options?: RequestInit, ttlSeconds = 60): Promise<CachedResponse> => {
    const method = options?.method?.toUpperCase() || 'GET';

    if (method !== 'GET') {
      // Mutation request (POST, PUT, DELETE). Invalidate cached read endpoints.
      const keysToClear = Object.keys(cache.current).filter((key) =>
        key.includes('/api/profiles/') && !key.includes('/api/profiles/chat/')
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
    <CacheContext.Provider value={{
      cachedFetch,
      hasCachedData,
      getCachedData,
      clearCache,
      invalidateKey,
      getChatMessages,
      setChatMessages,
      appendChatMessage,
      appendChatMessages,
      updateChatMessage,
      removeChatMessage
    }}>
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
