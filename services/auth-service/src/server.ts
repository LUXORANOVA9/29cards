// services/auth-service/src/server.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter as any);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register requests per hour
  message: 'Too many auth requests from this IP, please try again after an hour',
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ==================== TYPES ====================

interface TokenPayload {
  userId: string;
  role: string;
  panelId: string | null;
}

// Zod Schemas
const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(6),
  panelId: z.string().uuid().optional(),
  brokerId: z.string().uuid().optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided",
  path: ["email", "phone"],
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(1),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided",
  path: ["email", "phone"],
});

// ==================== HELPERS ====================

function generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
}

// ==================== ROUTES ====================

// Register
app.post('/api/v1/auth/register', authLimiter as any, async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { email, phone, password, panelId, brokerId } = validation.data;

    // Check existing user
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
    });

    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (Always PLAYER)
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        phone,
        passwordHash,
        role: 'PLAYER',
        panelId,
        brokerId,
      },
    });

    // Create wallet for player
    await prisma.wallet.create({
      data: {
        id: uuidv4(),
        userId: user.id,
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      role: user.role,
      panelId: user.panelId,
    });

    // Store session
    await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/v1/auth/login', authLimiter as any, async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { email, phone, password } = validation.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const tokens = generateTokens({
      userId: user.id,
      role: user.role,
      panelId: user.panelId,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
      },
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
