import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { validateEmail, validatePassword, handleValidationErrors, validateString } from '../middleware/validation';
import { generateToken, generateRefreshToken, refreshToken as refreshTokenHandler, authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logInfo, logWarn } from '../utils/logger';

const router = Router();

const userRepository = () => AppDataSource.getRepository(User);

router.post(
  '/register',
  [
    validateEmail,
    validateString('username', 3, 30),
    validatePassword,
    handleValidationErrors,
  ],
  async (req: Request, res: Response): Promise<void> => {
    const { email, username, password } = req.body;

    try {
      const existingUser = await userRepository().findOne({
        where: [{ email }, { username }],
      });

      if (existingUser) {
        res.status(400).json({ error: 'Email or username already exists' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = userRepository().create({
        email,
        username,
        passwordHash,
      });

      await userRepository().save(user);

      const token = generateToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id, user.email);

      logInfo('User registered', { userId: user.id, email: user.email });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      logWarn('Registration error', { error: (error as Error).message });
      throw new AppError(500, 'Registration failed');
    }
  }
);

router.post(
  '/login',
  [
    validateEmail,
    handleValidationErrors,
  ],
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
      const user = await userRepository().findOne({ where: { email } });

      if (!user) {
        logWarn('Login attempt with invalid email', { email });
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);

      if (!isValidPassword) {
        logWarn('Login attempt with invalid password', { userId: user.id });
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = generateToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id, user.email);

      logInfo('User logged in', { userId: user.id });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      logWarn('Login error', { error: (error as Error).message });
      throw new AppError(500, 'Login failed');
    }
  }
);

router.post('/refresh', refreshTokenHandler);

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await userRepository().findOne({
      where: { id: req.userId! },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (error) {
    throw new AppError(500, 'Failed to fetch user');
  }
});

export default router;
