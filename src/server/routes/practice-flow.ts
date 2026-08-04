import { Router } from 'express';
import { createSafeLogger } from '../../lib/safe-logger.ts';
import { parsePracticeFlowEvent } from '../../lib/practice-flow-analytics.ts';
import { recordPracticeFlowEvent } from '../services/practice-flow-store.ts';

const router = Router();
const logger = createSafeLogger('practice-flow-route');

function isPracticeFlowTelemetryEnabled() {
  return process.env.PRACTICE_FLOW_TELEMETRY_ENABLED === 'true';
}

router.post('/', (req, res) => {
  if (!isPracticeFlowTelemetryEnabled()) {
    return res.status(204).end();
  }

  const parsed = parsePracticeFlowEvent(req.body);
  if (!parsed.success) {
    logger.warn('Rejected invalid practice flow event', { reason: parsed.error });
    return res.status(400).json({ error: 'Invalid practice flow event' });
  }

  recordPracticeFlowEvent(parsed.data);
  res.status(202).json({ success: true });
});

export default router;
