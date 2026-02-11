import { body, validationResult } from 'express-validator';
import { Response, NextFunction } from 'express';

// Sanitize user input to prevent XSS
const sanitize = (input: string): string => {
  // Basic XSS protection - remove script tags and HTML
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
};

export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Invalid email address');

export const validatePassword = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must contain uppercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain number');

export const validateCampaignName = body('name')
  .trim()
  .isLength({ min: 1, max: 255 })
  .withMessage('Campaign name must be 1-255 characters')
  .customSanitizer((value) => sanitize(value));

export const validateString = (fieldName: string, minLength: number = 1, maxLength: number = 1000) => 
  body(fieldName)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`)
    .customSanitizer((value) => sanitize(value));

// Validation error handler
export const handleValidationErrors = (req: any, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: 'param' in e ? e.param : 'unknown',
        message: e.msg
      }))
    });
    return;
  }
  next();
};
