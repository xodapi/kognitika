import { Router } from 'express';
import { z } from 'zod';
import { createSafeLogger, redactText } from '../../lib/safe-logger';

const router = Router();
const logger = createSafeLogger('client-error');

const clientErrorSchema = z.object({
  name: z.string().max(120).optional(),
  message: z.string().max(1200),
  stack: z.string().max(4000).optional(),
  route: z.string().max(300).optional(),
  source: z.string().max(120).optional(),
  buildId: z.string().max(120).optional(),
  storageSchemaVersion: z.number().int().nonnegative().optional(),
  swController: z.boolean().optional(),
});

function sanitize(value: unknown, fallback = 'unknown') {
  return redactText(value || fallback, 1200);
}

router.post('/', (req, res) => {
  const result = clientErrorSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(202).json({ accepted: false });
  }

  const error = result.data;
  logger.warn('Client error reported', {
    name: sanitize(error.name, 'Error'),
    message: sanitize(error.message),
    route: sanitize(error.route, '/'),
    source: sanitize(error.source, 'client'),
    buildId: sanitize(error.buildId, 'unknown'),
    storageSchemaVersion: error.storageSchemaVersion,
    swController: error.swController,
  });

  res.status(202).json({ accepted: true });
});

export default router;
