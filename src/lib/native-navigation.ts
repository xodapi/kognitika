import { App as CapacitorApp } from '@capacitor/app';
import { isAppRoute } from './routes';
import { isNativeRuntime } from './runtime-platform';

const DEEP_LINK_HOSTS = new Set(['kognitika.syntog.ru']);
const NATIVE_LIFECYCLE_INSTALLED = '__kognitikaNativeLifecycleInstalled';

export function resolveNativeRoute(url: string) {
  try {
    const parsed = new URL(url);
    let pathname: string | null = null;
    if (parsed.protocol === 'kognitika:') {
      pathname = `/${[parsed.hostname, parsed.pathname.replace(/^\/+/, '')]
        .filter(Boolean)
        .join('/')}`;
    }
    if (parsed.protocol === 'https:' && DEEP_LINK_HOSTS.has(parsed.hostname)) {
      pathname = parsed.pathname;
    }
    return pathname && isAppRoute(pathname) ? `${pathname}${parsed.search}` : null;
  } catch {
    return null;
  }
}

export function initializeNativeAppLifecycle() {
  const runtime = globalThis as typeof globalThis & Record<string, boolean | undefined>;
  if (!isNativeRuntime() || runtime[NATIVE_LIFECYCLE_INSTALLED]) return;
  runtime[NATIVE_LIFECYCLE_INSTALLED] = true;

  void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    const route = resolveNativeRoute(url);
    if (route) window.location.hash = `#${route}`;
  });

  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
      return;
    }
    void CapacitorApp.exitApp();
  });
}
