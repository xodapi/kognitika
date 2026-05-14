import { useEffect } from 'react';
import { eventBus } from '../lib/event-bus';
import { EventMap } from '../lib/event-schema';

export function useEventBus<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void) {
  useEffect(() => {
    return eventBus.on(event, callback);
  }, [event, callback]);
}

export const emitEvent = <K extends keyof EventMap>(event: K, data: EventMap[K]) => {
  eventBus.emit(event, data);
};
