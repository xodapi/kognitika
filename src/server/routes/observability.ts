import { Router } from 'express';
import { z } from 'zod';

const router = Router();

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

const REDACTION_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\bBR-[A-Z0-9-]{6,}\b/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /(token|refresh|authorization|password)["':=\s]+[^"',\s]+/gi,
];

function sanitize(value: unknown, fallback = 'unknown') {
  const text = String(value || fallback).slice(0, 1200);
  return REDACTION_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[redacted]'), text);
}

router.post('/', (req, res) => {
  const result = clientErrorSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(202).json({ accepted: false });
  }

  const error = result.data;
  console.warn('[ClientError]', {
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
