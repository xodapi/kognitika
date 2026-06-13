import { EventMap } from './event-schema';
import { createSafeLogger } from './safe-logger';

const logger = createSafeLogger('event-recorder');

interface RecordedEvent {
  timestamp: number;
  event: keyof EventMap;
  data: any;
}

class EventRecorder {
  private currentSession: RecordedEvent[] = [];
  private isRecording: boolean = false;
  private startTime: number = 0;

  start() {
    this.currentSession = [];
    this.isRecording = true;
    this.startTime = Date.now();
    logger.debug('Session recording started');
  }

  stop() {
    this.isRecording = false;
    logger.debug('Session recording stopped', { eventCount: this.currentSession.length });
    return this.currentSession;
  }

  record<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    if (!this.isRecording) return;
    
    this.currentSession.push({
      timestamp: Date.now() - this.startTime,
      event,
      data
    });
  }

  getLog() {
    return JSON.stringify(this.currentSession, null, 2);
  }

  download() {
    const blob = new Blob([this.getLog()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kognitika-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const eventRecorder = new EventRecorder();
