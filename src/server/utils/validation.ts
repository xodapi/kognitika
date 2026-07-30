// Re-export validation middleware from centralized location
export { 
  validate, 
  validateBody, 
  validateQuery, 
  validateParams, 
  handleValidationError,
  type ValidationErrorResponse 
} from '../middleware/validate.ts';
