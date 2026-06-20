import {
  type PracticeFlowEvent,
  summarizePracticeFlowEvents,
} from '../../lib/practice-flow-analytics.ts';

const MAX_EVENTS = 5_000;
const events: PracticeFlowEvent[] = [];

export function recordPracticeFlowEvent(event: PracticeFlowEvent) {
  events.push(event);

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
}

export function getPracticeFlowEvents() {
  return [...events];
}

export function getPracticeFlowSummary() {
  return summarizePracticeFlowEvents(events);
}

export function clearPracticeFlowEventsForTests() {
  events.splice(0, events.length);
}
