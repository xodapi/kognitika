import { createEventBus, EventMap } from '../../core/events';
import { antiFraud } from '../../lib/anti-fraud';
import { getDifficultySuggestion } from '../../lib/cognitive-metrics';
import { eventRecorder } from '../../lib/event-recorder';
import { createSafeLogger } from '../../lib/safe-logger';

const logger = createSafeLogger('client-event-bus');

export const eventBus = createEventBus({
  onValidationError: (event, error) => {
    logger.error('Validation failed', { event, error });
  },
});

eventBus.use((event, data, next) => {
  eventRecorder.record(event, data);
  next();
});

eventBus.use((event, data, next) => {
  const check = antiFraud.validateSession(event, data);
  if (check.isAnomalous) {
    logger.warn('Anomalous activity detected', { event, reason: check.reason });
    if (event === 'TRAINING_COMPLETE') {
      const payload = data as EventMap['TRAINING_COMPLETE'];
      payload.metadata = { ...payload.metadata, anomalous: true, reason: check.reason };
    }
  }
  next();
});

let clickBuffer: { cellId: number; reactionTimeMs: number }[] = [];
const BUFFER_THRESHOLD = 5;

eventBus.use((event, data, next) => {
  if (event === 'CELL_CLICK') {
    const clickData = data as EventMap['CELL_CLICK'];
    clickBuffer.push({
      cellId: Number(clickData.cellId ?? 0),
      reactionTimeMs: clickData.reactionTimeMs
    });

    if (clickBuffer.length >= BUFFER_THRESHOLD) {
      const times = clickBuffer.map(c => c.reactionTimeMs);
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

eventBus.use((event, data, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Event emitted', { event, data });
  }
  next();
});

export { EventBus } from '../../core/events';
