// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    panelId?: string;
    brokerId?: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      panelId: decoded.panelId,
      brokerId: decoded.brokerId
    };
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requirePanelAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admin users can access all panels
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Check if user has access to the requested panel
  const requestedPanelId = req.query.panelId as string || req.body.panelId;
  
  if (requestedPanelId && req.user.panelId !== requestedPanelId) {
    res.status(403).json({ error: 'Access to this panel is not allowed' });
    return;
  }

  next();
};