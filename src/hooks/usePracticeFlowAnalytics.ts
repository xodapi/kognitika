import { useEffect } from 'react';
import {
  abandonPracticeFlow,
  recordPracticeFlowCheckpoint,
  startPracticeFlow,
} from '../lib/practice-flow-client';

const CHECKPOINTS = [
  { name: 'engaged_15s', delayMs: 15_000 },
  { name: 'engaged_45s', delayMs: 45_000 },
] as const;

const INACTIVITY_TIMEOUT_MS = 120_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;

export function usePracticeFlowAnalytics(pathname: string) {
  useEffect(() => {
    const active = startPracticeFlow(pathname);
    if (!active) return undefined;

    const timers = CHECKPOINTS.map((checkpoint) => window.setTimeout(() => {
      recordPracticeFlowCheckpoint(checkpoint.name);
    }, checkpoint.delayMs));

    let inactivityTimer = window.setTimeout(() => {
      abandonPracticeFlow('inactive');
    }, INACTIVITY_TIMEOUT_MS);

    const resetInactivityTimer = () => {
      window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        abandonPracticeFlow('inactive');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const onPageHide = () => abandonPracticeFlow('pagehide');
    window.addEventListener('pagehide', onPageHide);
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(inactivityTimer);
      window.removeEventListener('pagehide', onPageHide);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
      abandonPracticeFlow('route_change');
    };
  }, [pathname]);
}
