import { useEffect } from 'react';
import { eventRecorder } from '../lib/event-recorder';
import { createSafeLogger } from '../lib/safe-logger';

const logger = createSafeLogger('session-recording');

export function useSessionRecording(isActive: boolean, isFinished: boolean) {
  useEffect(() => {
    if (isActive && !isFinished) {
      eventRecorder.start();
    }
    
    if (isFinished) {
      const log = eventRecorder.stop();
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Session log captured', { eventCount: log.length });
        // We could also store this in a hidden field for "Submit with Logs" feature
      }
    }
  }, [isActive, isFinished]);
}
