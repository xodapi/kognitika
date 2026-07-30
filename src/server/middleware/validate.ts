import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodSchema, z, type ZodObject, type ZodRawShape } from 'zod';
import { createSafeLogger } from '../../lib/safe-logger.ts';

const logger = createSafeLogger('validation');

/**
 * Standardized validation error response
 */
export interface ValidationErrorResponse {
  error: string;
  code: 'VALIDATION_ERROR';
  issues: Array<{
    path: (string | number)[];
    message: string;
    code: string;
  }>;
}

/**
 * Extend Express Request type to include validated data
 */
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
        headers?: any;
      };
    }
  }
}

/**
 * Type for a Zod object schema that validates { body, query, params, headers }
 */
type RequestSchema = ZodObject<{
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}>;

/**
 * Creates a validation middleware for a Zod schema
 * Handles body, query, params, or headers validation
 * 
 * Usage:
 *   app.post('/api/route', validate(mySchema), handler);
 * 
 * Schema should validate { body, query, params, headers }
 */
export function validate(schema: RequestSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });

      if (!result.success) {
        const errorResponse: ValidationErrorResponse = {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          issues: result.error.issues.map((issue) => ({
            path: issue.path as (string | number)[],
            message: issue.message,
            code: issue.code,
          })),
        };

        logger.warn('Validation failed', { 
          path: req.path, 
          method: req.method, 
          issues: errorResponse.issues 
        });

        return res.status(400).json(errorResponse);
      }

      // Attach validated data to request
      req.validated = result.data as any;
      next();
    } catch (error) {
      logger.error('Validation middleware error', { error: String(error) });
      next(error);
    }
  };
}

/**
 * Validates only the request body
 * 
 * Usage:
 *   app.post('/api/route', validateBody(bodySchema), handler);
 */
export function validateBody<T extends ZodSchema>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        issues: result.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    req.validated = { ...req.validated, body: result.data };
    next();
  };
}

/**
 * Validates only query parameters
 * 
 * Usage:
 *   app.get('/api/route', validateQuery(querySchema), handler);
 */
export function validateQuery<T extends ZodSchema>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        issues: result.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    req.validated = { ...req.validated, query: result.data };
    next();
  };
}

/**
 * Validates only route parameters
 * 
 * Usage:
 *   app.get('/api/route/:id', validateParams(paramsSchema), handler);
 */
export function validateParams<T extends ZodSchema>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid route parameters',
        code: 'VALIDATION_ERROR',
        issues: result.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    req.validated = { ...req.validated, params: result.data };
    next();
  };
}

/**
 * Validates only headers
 * 
 * Usage:
 *   app.get('/api/route', validateHeaders(headersSchema), handler);
 */
export function validateHeaders<T extends ZodSchema>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.headers);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid headers',
        code: 'VALIDATION_ERROR',
        issues: result.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    req.validated = { ...req.validated, headers: result.data };
    next();
  };
}

/**
 * Creates a combined schema for full request validation
 * 
 * Usage:
 *   const schema = createRequestSchema({
 *     body: bodySchema,
 *     query: querySchema,
 *     params: paramsSchema,
 *     headers: headersSchema
 *   });
 *   app.post('/api/route', validate(schema), handler);
 */
export function createRequestSchema<TBody, TQuery, TParams, THeaders>(
  options: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
    headers?: ZodSchema<THeaders>;
  }
): RequestSchema {
  const shape: Record<string, ZodSchema> = {};
  
  if (options.body) shape.body = options.body;
  if (options.query) shape.query = options.query;
  if (options.params) shape.params = options.params;
  if (options.headers) shape.headers = options.headers;
  
  return z.object(shape).strict();
}

/**
 * Helper to create common validation schemas
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid({ message: 'Must be a valid UUID' }),
  
  // Brain ID validation (format: BR-XXXXXXXX)
  brainId: z.string().regex(/^BR-[A-Z0-9]{8}$/, { 
    message: 'Invalid Brain ID format. Expected: BR-XXXXXXXX' 
  }),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  
  // Date range
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
  
  // ID parameter
  idParam: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
};

/**
 * Validation error formatter for logging
 */
export function formatValidationError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

/**
 * Middleware to sanitize input (trim strings, etc.)
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
}

/**
 * Legacy helper for backward compatibility
 * @deprecated Use validateBody() instead
 */
export function handleValidationError(result: any, res: Response) {
  if (!result.success) {
    return res.status(400).json({ 
      error: result.error.issues[0].message,
      details: result.error.issues 
    });
  }
  return null;
}
