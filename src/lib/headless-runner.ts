import { eventBus } from './event-bus';
import { EventMap } from './event-schema';
import { createSafeLogger } from './safe-logger';

const logger = createSafeLogger('headless-runner');

interface RecordedEvent {
  timestamp: number;
  event: keyof EventMap;
  data: any;
}

/**
 * HeadlessRunner (Game Studio QA Style)
 * Replays a session log to verify state transitions and analytics.
 */
export class HeadlessRunner {
  private log: RecordedEvent[];

  constructor(log: RecordedEvent[]) {
    this.log = log;
  }

  /**
   * Replay events with original timing (Async)
   */
  async replayAsync() {
    logger.debug('Starting async replay', { eventCount: this.log.length });
    for (let i = 0; i < this.log.length; i++) {
      const current = this.log[i];
      const prev = i > 0 ? this.log[i - 1] : { timestamp: 0 };
      const delay = current.timestamp - prev.timestamp;

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      eventBus.emit(current.event, current.data);
    }
    logger.debug('Replay finished');
  }

  /**
   * Replay events instantly (Sync/Batch)
   * Useful for unit tests where we don't want to wait.
   */
  replaySync() {
    logger.debug('Starting sync replay', { eventCount: this.log.length });
    this.log.forEach(item => {
      eventBus.emit(item.event, item.data);
    });
  }
}
