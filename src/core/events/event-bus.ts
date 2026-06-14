import { EventMap, EventRegistry } from './event-schema';

export type EventCallback<K extends keyof EventMap> = (data: EventMap[K]) => void;
export type EventMiddleware = <K extends keyof EventMap>(event: K, data: EventMap[K], next: () => void) => void;
export type ValidationErrorHandler = <K extends keyof EventMap>(event: K, error: unknown) => void;

export class EventBus {
  public static readonly EVENTS = {
    TRAINING_COMPLETE: 'TRAINING_COMPLETE' as const,
    GAME_COMPLETED: 'game:completed' as const,
    CELL_CLICK: 'CELL_CLICK' as const,
    STABILITY_UPDATE: 'STABILITY_UPDATE' as const,
    DIFFICULTY_SUGGESTION: 'DIFFICULTY_SUGGESTION' as const,
    FEEDBACK_SUBMITTED: 'feedback:submitted' as const,
    IDEA_SUBMITTED: 'idea:submitted' as const,
  };

  private listeners: { [K in keyof EventMap]?: EventCallback<K>[] } = {};
  private middlewares: EventMiddleware[] = [];
  private onValidationError?: ValidationErrorHandler;

  constructor(options: { onValidationError?: ValidationErrorHandler } = {}) {
    this.onValidationError = options.onValidationError;
  }

  use(mw: EventMiddleware) {
    this.middlewares.push(mw);
  }

  on<K extends keyof EventMap>(event: K, callback: EventCallback<K>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<K>) {
    const list = this.listeners[event];
    if (!list) return;
    this.listeners[event] = list.filter(cb => cb !== callback) as any;
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const schema = EventRegistry[event];
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        this.onValidationError?.(event, result.error.format());
        return;
      }
    }

    let index = 0;
    const next = () => {
      if (index < this.middlewares.length) {
        const mw = this.middlewares[index++];
        mw(event, data, next);
        return;
      }

      const list = this.listeners[event];
      if (list) {
        list.forEach(cb => cb(data));
      }
    };

    next();
  }
}

export function createEventBus(options: { onValidationError?: ValidationErrorHandler } = {}) {
  return new EventBus(options);
}
