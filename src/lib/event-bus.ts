import { EventMap, EventRegistry } from './event-schema';
import { eventRecorder } from './event-recorder';
import { getDifficultySuggestion } from './cognitive-metrics';
import { antiFraud } from './anti-fraud';
import { createSafeLogger } from './safe-logger';

const logger = createSafeLogger('event-bus');

type EventCallback<K extends keyof EventMap> = (data: EventMap[K]) => void;
type Middleware = <K extends keyof EventMap>(event: K, data: EventMap[K], next: () => void) => void;

class EventBus {
  public static readonly EVENTS = {
    TRAINING_COMPLETE: 'TRAINING_COMPLETE' as const,
    GAME_COMPLETED: 'game:completed' as const,
    CELL_CLICK: 'CELL_CLICK' as const,
    STABILITY_UPDATE: 'STABILITY_UPDATE' as const,
    DIFFICULTY_SUGGESTION: 'DIFFICULTY_SUGGESTION' as const,
    FEEDBACK_SUBMITTED: 'feedback:submitted' as const,
  };

  private listeners: { [K in keyof EventMap]?: EventCallback<K>[] } = {};
  private middlewares: Middleware[] = [];

  /**
   * Add middleware to the event pipeline (Game Engine Style)
   */
  use(mw: Middleware) {
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
    // 1. Validate data if schema exists
    const schema = EventRegistry[event];
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        logger.error('Validation failed', { event, error: result.error.format() });
        return;
      }
    }

    // 2. Execute Middleware pipeline
    let index = 0;
    const next = () => {
      if (index < this.middlewares.length) {
        const mw = this.middlewares[index++];
        mw(event, data, next);
      } else {
        // 3. Final delivery to listeners
        const list = this.listeners[event];
        if (list) {
          list.forEach(cb => cb(data));
        }
      }
    };

    next();
  }
}

export const eventBus = new EventBus();

// --- Default Middlewares (World Class Observability) ---

// Recorder Middleware (Captures all events for replay)
eventBus.use((event, data, next) => {
  eventRecorder.record(event, data);
  next();
});

// Anti-Fraud Middleware (Security Gate)
eventBus.use((event, data, next) => {
  const check = antiFraud.validateSession(event, data);
  if (check.isAnomalous) {
    logger.warn('Anomalous activity detected', { event, reason: check.reason });
    // For now, we just flag it in metadata. In future, we can abort the session.
    if (event === 'TRAINING_COMPLETE') {
      const payload = data as EventMap['TRAINING_COMPLETE'];
      payload.metadata = { ...payload.metadata, anomalous: true, reason: check.reason };
    }
  }
  next();
});

// Analytical Sink (Pipes events to Rust kernel)
let clickBuffer: { cell: number; reactionTime: number }[] = [];
const BUFFER_THRESHOLD = 5;

eventBus.use((event, data, next) => {
  if (event === 'CELL_CLICK') {
    const clickData = data as EventMap['CELL_CLICK'];
    clickBuffer.push({
      cell: Number(clickData.cellId ?? 0),
      reactionTime: clickData.reactionTimeMs
    });

    if (clickBuffer.length >= BUFFER_THRESHOLD) {
      const times = clickBuffer.map(c => c.reactionTime);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / times.length;
      const stability = Math.sqrt(variance);

      eventBus.emit('STABILITY_UPDATE', { avg, stability });

      getDifficultySuggestion(avg, stability).then(suggestion => {
        eventBus.emit('DIFFICULTY_SUGGESTION', suggestion);
      });
      clickBuffer = [];
    }
  }
  if (event === 'TRAINING_COMPLETE') clickBuffer = [];
  next();
});

// Logger Middleware (Console Game Style)
eventBus.use((event, data, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Event emitted', { event, data });
  }
  next();
});

// Analytical Bridge (Future: Direct pipe to Rust WASM worker)
eventBus.use((event, data, next) => {
  if (event === 'CELL_CLICK') {
    // Here we can trigger real-time metrics update in Rust
  }
  next();
});
