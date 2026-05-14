import { eventBus } from './event-bus.ts';

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
    console.log(`[PERF] User taking > 1 min for Schulte. Possible UX issue or heavy lag.`);
  }
});

// Error Tracking (Simulated Sentry)
eventBus.on('error', (err) => {
  console.error(`[CRITICAL] System Error logged to Observability:`, err);
  // Integration with Sentry/Logtail would go here
});
