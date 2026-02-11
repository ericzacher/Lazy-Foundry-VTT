import { AppError } from '../middleware/errorHandler';
import { logWarn } from '../utils/logger';

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) unless it's a 408 (timeout) or 429 (rate limit)
      if (error instanceof AppError) {
        if (
          error.statusCode < 500 &&
          error.statusCode !== 408 &&
          error.statusCode !== 429
        ) {
          throw error;
        }
      }

      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        logWarn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`, {
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError!;
}
