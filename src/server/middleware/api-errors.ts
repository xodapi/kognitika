import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ZodIssue } from 'zod';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';

const logger = createSafeLogger('api-errors');

export function validationErrorResponse(
  error: string,
  issues: Array<Pick<ZodIssue, 'path' | 'message' | 'code'>> = [],
) {
  return {
    error,
    code: 'VALIDATION_ERROR' as const,
    issues: issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    })),
  };
}

export const apiNotFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: 'API route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
  });
};

function isJsonSyntaxError(error: unknown): error is SyntaxError & { status?: number; body?: unknown } {
  return error instanceof SyntaxError &&
    'body' in error &&
    (error as { status?: number }).status === 400;
}

export const apiErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (!req.originalUrl.startsWith('/api/')) {
    next(error);
    return;
  }

  if (isJsonSyntaxError(error)) {
    res.status(400).json(validationErrorResponse('Malformed JSON request body'));
    return;
  }

  logger.error('Unhandled API error', {
    error: safeError(error),
    method: req.method,
    path: req.originalUrl,
  });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
};
