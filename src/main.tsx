/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './lib/zod-config.ts';
import App from './App.tsx';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import { setupGlobalErrorReporting } from './lib/client-error.ts';
import { installNativeNetworkBridge, isNativeRuntime } from './lib/runtime-platform.ts';
import { initializeNativeAppLifecycle } from './lib/native-navigation.ts';

declare global {
  interface Window {
    __KOGNITIKA_BOOT__?: {
      markModuleStarted?: () => void;
      markMounted?: () => void;
    };
  }
}

installNativeNetworkBridge();
initializeNativeAppLifecycle();
setupGlobalErrorReporting();
window.__KOGNITIKA_BOOT__?.markModuleStarted?.();

const nativeRuntime = isNativeRuntime();
if (nativeRuntime) document.documentElement.classList.add('native-runtime');

const Router = nativeRuntime ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <Router>
        <App />
      </Router>
    </ThemeProvider>
  </StrictMode>,
);

window.requestAnimationFrame(() => {
  window.__KOGNITIKA_BOOT__?.markMounted?.();
});
