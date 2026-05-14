import { EventMap } from './event-schema';

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
    console.log('[EventRecorder] Session recording started.');
  }

  stop() {
    this.isRecording = false;
    console.log('[EventRecorder] Session recording stopped. Total events:', this.currentSession.length);
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
