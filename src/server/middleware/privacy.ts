import { Request, Response, NextFunction } from 'express';

/**
 * Privacy Middleware for Brain ID (Anonymous Mode)
 * Очищает конфиденциальные данные (IP, User-Agent, Fingerprint) из объекта запроса,
 * если пользователь авторизован через Brain ID. Это предотвращает случайное логгирование
 * персональных данных в системных журналах (соответствие 152-ФЗ).
 */
export const privacyGuard = (req: any, res: Response, next: NextFunction) => {
  // Проверяем, является ли сессия анонимной (Brain ID)
  const isAnonymous = req.user && req.user.brainId;

  if (isAnonymous) {
    // Маскируем IP адрес
    Object.defineProperty(req, 'ip', {
      value: '0.0.0.0',
      writable: false
    });

    // Маскируем заголовки, которые могут быть использованы для фингерпринтинга
    const sensitiveHeaders = ['user-agent', 'accept-language', 'x-forwarded-for', 'true-client-ip'];
    sensitiveHeaders.forEach(header => {
      if (req.headers[header]) {
        req.headers[header] = '[REDACTED]';
      }
    });

    // Очищаем другие потенциальные следы
    req.fingerprint = undefined;
  }

  next();
};
