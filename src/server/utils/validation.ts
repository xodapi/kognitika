import { Response } from 'express';

/**
 * Стандартизированный обработчик ошибок валидации Zod для Express-роутов.
 */
export function handleValidationError(result: any, res: Response) {
  if (!result.success) {
    // В Zod ошибки всегда содержат массив issues
    return res.status(400).json({ 
      error: result.error.issues[0].message,
      details: result.error.issues 
    });
  }
  return null;
}
