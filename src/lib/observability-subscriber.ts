import { eventBus } from '../server/events/event-bus.ts';
import { createSafeLogger, safeError } from './safe-logger.ts';

const logger = createSafeLogger('observability-subscriber');

/**
 * Subscriber: Observability & Security (World Class Standards)
 * Monitors for anomalies, errors, and performance bottlenecks.
 */

// Anti-Cheat: Integrated via EventBus Middleware (see event-bus.ts)
// This subscriber now only handles non-blocking side effects.

// Performance Monitoring: Log slow sessions
eventBus.on('game:completed', (data) => {
  const { timeMs, gameType } = data;
  if (timeMs > 60000 && gameType === 'SCHULTE') {
    logger.warn('Slow Schulte session detected', { gameType, timeMs });
  }
});

// Error Tracking (Simulated Sentry)
eventBus.on('error', (err) => {
  logger.error('System error observed', { error: safeError(err) });
  // Integration with Sentry/Logtail would go here
});
