// config.ts
const raw = import.meta.env.VITE_API_URL as string;
export const API_URL = raw.endsWith('/') ? raw.slice(0, -1) : raw;