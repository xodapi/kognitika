import { Request, Response, NextFunction } from 'express';

export function applyPrivacyRedaction(req: any) {
  const isAnonymous = req.user?.brainId || req.user?.identity === 'brain';
  if (!isAnonymous) return;

  try {
    Object.defineProperty(req, 'ip', {
      value: '0.0.0.0',
      writable: false,
      configurable: true,
    });
  } catch {
    // Some test/server adapters expose req.ip as a non-configurable getter.
  }

  const sensitiveHeaders = ['user-agent', 'accept-language', 'x-forwarded-for', 'true-client-ip'];
  sensitiveHeaders.forEach((header) => {
    if (req.headers[header]) {
      req.headers[header] = '[REDACTED]';
    }
  });

  req.fingerprint = undefined;
}

/**
 * Privacy Middleware for Brain ID (Anonymous Mode)
 * Очищает конфиденциальные данные (IP, User-Agent, Fingerprint) из объекта запроса,
 * если пользователь авторизован через Brain ID. Это предотвращает случайное логгирование
 * персональных данных в системных журналах (соответствие 152-ФЗ).
 */
export const privacyGuard = (req: any, res: Response, next: NextFunction) => {
  applyPrivacyRedaction(req);
  next();
};
