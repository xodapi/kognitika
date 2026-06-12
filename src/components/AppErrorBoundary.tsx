import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, RotateCcw, ShieldCheck } from 'lucide-react';
import { storageGateway } from '../lib/storage-gateway';
import { reportClientError } from '../lib/client-error';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportClientError(error, {
      source: `react-error-boundary:${errorInfo.componentStack ? 'component-stack' : 'unknown'}`,
    });
  }

  private reload = () => {
    window.location.reload();
  };

  private resetAppState = async () => {
    storageGateway.clear('app');

    try {
      if ('caches' in window) {
        const names = await window.caches.keys();
        await Promise.all(names.map((name) => window.caches.delete(name)));
      }
    } catch {
      // Cache cleanup is best effort; local app-state reset is the critical part.
    }

    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl border border-border bg-card rounded-3xl shadow-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase mb-3">
            Интерфейс не загрузился
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Мы сохранили вашу идентификацию. Сброс ниже очищает только временное состояние приложения:
            настройки интерфейса, кеш и промежуточные данные. Brain ID и токен входа не удаляются.
          </p>

          <div className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 text-primary px-4 py-3 mb-6">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Прогресс остаётся привязан к Brain ID
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={this.reload}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary text-foreground px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-secondary/80 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Перезагрузить
            </button>
            <button
              type="button"
              onClick={this.resetAppState}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="h-4 w-4" />
              Сбросить состояние
            </button>
          </div>
        </div>
      </div>
    );
  }
}
