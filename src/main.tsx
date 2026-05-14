/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

// PWA Update Logic
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Check for updates every hour
      setInterval(() => {
        reg.update();
      }, 60 * 60 * 1000);

      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available; force refresh or notify user
              console.log('New content available, refreshing...');
              if (confirm('Доступна новая версия Kognitika. Обновить сейчас?')) {
                window.location.reload();
              }
            }
          };
        }
      };
    }).catch(error => {
      console.error('SW registration failed:', error);
    });
  });
}

// Force clean stale state on load
const APP_VERSION = '2.2.0';
const savedVersion = localStorage.getItem('kognitika_version');
if (savedVersion !== APP_VERSION) {
  console.log(`[Version] Updating to ${APP_VERSION}...`);
  localStorage.clear();
  localStorage.setItem('kognitika_version', APP_VERSION);
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }

  if ('caches' in window) {
    caches.keys().then(names => {
      for (let name of names) caches.delete(name);
    });
  }
  
  setTimeout(() => window.location.reload(), 500);
}
