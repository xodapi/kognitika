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

export function usePracticeFlowAnalytics(pathname: string) {
  useEffect(() => {
    const active = startPracticeFlow(pathname);
    if (!active) return undefined;

    const timers = CHECKPOINTS.map((checkpoint) => window.setTimeout(() => {
      recordPracticeFlowCheckpoint(checkpoint.name);
    }, checkpoint.delayMs));

    const onPageHide = () => abandonPracticeFlow('pagehide');
    window.addEventListener('pagehide', onPageHide);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('pagehide', onPageHide);
      abandonPracticeFlow('route_change');
    };
  }, [pathname]);
}
