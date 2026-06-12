import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// Global interceptor for standard fetch calls to handle 401 Unauthorized
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  if (response.status === 401) {
    // Determine if it's admin or regular based on URL path if possible
    const url = args[0] ? args[0].toString() : '';
    if (url.includes('/admin')) {
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
    } else {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }
  return response;
};

// Also intercept Axios, primarily used in the Admin dashboard
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/admin')) {
        window.dispatchEvent(new CustomEvent('admin:unauthorized'));
      } else {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
