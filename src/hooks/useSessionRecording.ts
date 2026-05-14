import { useEffect } from 'react';
import { eventRecorder } from '../lib/event-recorder';

export function useSessionRecording(isActive: boolean, isFinished: boolean) {
  useEffect(() => {
    if (isActive && !isFinished) {
      eventRecorder.start();
    }
    
    if (isFinished) {
      const log = eventRecorder.stop();
      if (process.env.NODE_ENV === 'development') {
        console.log('[EventRecorder] Session Log:', log);
        // We could also store this in a hidden field for "Submit with Logs" feature
      }
    }
  }, [isActive, isFinished]);
}
