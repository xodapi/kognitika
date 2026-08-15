import type { Response } from 'express';

export type DomainErrorCategory =
  | 'validation'
  | 'notFound'
  | 'forbidden'
  | 'conflict'
  | 'internal';

export abstract class DomainError extends Error {
  abstract readonly category: DomainErrorCategory;
  abstract readonly code: string;
  abstract readonly status: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Maps only safe, known domain errors to the public API contract.
 * Unknown errors must remain generic at the HTTP boundary.
 */
export function sendDomainError(res: Response, error: unknown): boolean {
  if (!isDomainError(error)) return false;

  res.status(error.status).json({
    error: error.message,
    code: error.code,
  });
  return true;
}
