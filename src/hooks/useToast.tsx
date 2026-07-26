import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

const DEFAULT_DURATION = 4500;

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' },
  error: { icon: XCircle, className: 'border-destructive/20 bg-destructive/10 text-destructive' },
  info: { icon: Info, className: 'border-primary/20 bg-primary/10 text-primary' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextType['toast']>(({ title, description, variant = 'info', duration = DEFAULT_DURATION }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, title, description, variant }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 inset-x-0 z-[300] flex flex-col items-center gap-2 px-4 pointer-events-none sm:top-6 sm:items-end sm:right-6 sm:left-auto sm:inset-x-auto"
      >
        <AnimatePresence>
          {toasts.map((item) => {
            const { icon: Icon, className } = VARIANT_STYLES[item.variant];
            return (
              <motion.div
                key={item.id}
                role="status"
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className={cn(
                  'pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md flex items-start gap-3',
                  className,
                )}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Закрыть уведомление"
                  className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
