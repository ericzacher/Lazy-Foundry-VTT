import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable not set');
  }
  console.warn('Using default JWT secret - not suitable for production');
  return 'default-secret-change-in-production';
})();

const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Extend Express Request with auth fields
export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token signature and expiry
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Check token age - warn if older than 12 hours (but still valid)
    if (decoded.iat) {
      const ageHours = (Date.now() - decoded.iat * 1000) / (1000 * 60 * 60);
      if (ageHours > 12) {
        // Token is old but still valid - consider refreshing
        res.setHeader('X-Token-Refresh-Suggested', 'true');
      }
    }

    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
}

// Helper to generate tokens
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function generateRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

// Refresh token handler
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;
    
    // Issue new access token
    const newToken = generateToken(decoded.userId, decoded.email);
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.email);

    res.json({ 
      token: newToken,
      refreshToken: newRefreshToken 
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}
