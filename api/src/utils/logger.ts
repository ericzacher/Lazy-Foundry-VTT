// Simple logger implementation
// In production, consider using winston or pino for more features

interface LogContext {
  [key: string]: any;
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(level: string): boolean {
  const currentLevel = LOG_LEVELS[LOG_LEVEL as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info;
  const messageLevel = LOG_LEVELS[level as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.info;
  return messageLevel <= currentLevel;
}

function formatLog(level: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    service: 'lazy-foundry-api',
    environment: process.env.NODE_ENV || 'development',
    ...context,
  };
  return JSON.stringify(logEntry);
}

export function logError(message: string, context?: LogContext): void {
  if (shouldLog('error')) {
    console.error(formatLog('error', message, context));
  }
}

export function logWarn(message: string, context?: LogContext): void {
  if (shouldLog('warn')) {
    console.warn(formatLog('warn', message, context));
  }
}

export function logInfo(message: string, context?: LogContext): void {
  if (shouldLog('info')) {
    console.log(formatLog('info', message, context));
  }
}

export function logDebug(message: string, context?: LogContext): void {
  if (shouldLog('debug')) {
    console.debug(formatLog('debug', message, context));
  }
}

// Default export object with all functions
export const logger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
};
