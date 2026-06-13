import { createEventBus } from '../../core/events';
import { createSafeLogger } from '../../lib/safe-logger';

const logger = createSafeLogger('server-event-bus');

export const eventBus = createEventBus({
  onValidationError: (event, error) => {
    logger.error('Validation failed', { event, error });
  },
});

export { EventBus } from '../../core/events';
