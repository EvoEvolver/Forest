import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
const isDevelopment = process.env.NODE_ENV === 'development';
// disable authentication before we finish the login flow
const noAuthRequired = false

// Interface for JWT claims from Supabase
interface SupabaseJWTClaims {
  email: string;
  sub: string; // user ID
  role: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  [key: string]: any;
}

// Extended Request interface to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to authenticate Supabase JWT tokens
 * Verifies the token signature using SUPABASE_JWT_SECRET
 * Extracts user information and adds it to the request object
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Always grant permission in development mode
    if (isDevelopment || noAuthRequired) {
      console.log('⚠️ Development mode: AI permission automatically granted');
      req.user = {
        id: 'dev-user',
        email: 'dev-user@test.com',
        role: 'authenticated'
      };
      next();
      return;
    }
    // Get JWT secret from environment
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('SUPABASE_JWT_SECRET environment variable is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, jwtSecret) as SupabaseJWTClaims;

    // Validate token claims
    if (!decoded.email || !decoded.sub) {
      res.status(401).json({ error: 'Invalid token claims' });
      return;
    }

    // Check if token is expired (additional safety check)
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    // Add user information to request object
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'authenticated'
    };

    console.log(`✅ Authenticated request from user: ${req.user.email}`);
    
    // Continue to next middleware/route handler
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT verification failed:', error.message);
      res.status(401).json({ error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      console.error('JWT token expired:', error.message);
      res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

/**
 * Middleware to check AI permission
 */
export const requireAIPermission = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // For now, all authenticated users can use AI
  // TODO: specify on backend
  const hasAIPermission = true; // Future: check user subscription/permissions

  if (!hasAIPermission) {
    res.status(403).json({
      error: 'AI access not available',
      message: 'Please upgrade your subscription to use AI features'
    });
    return;
  }

  console.log(`✅ AI permission granted for user: ${req.user.email}`);
  next();
};

/**
 * Future-ready permission middleware for file uploads
 */
export const requireFileUploadPermission = (maxFileSize: number = 10) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Future implementation: check user's file upload permissions
    const userMaxFileSize = 10; // Future: get from user subscription/settings
    
    if (userMaxFileSize < maxFileSize) {
      res.status(403).json({ 
        error: 'File size limit exceeded', 
        message: `Maximum file size for your plan: ${userMaxFileSize}MB` 
      });
      return;
    }

    next();
  };
};

/**
 * Future-ready permission middleware for file uploads
 */
export const requireCreateTreePermission = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // TODO: specify on backend
    const hasCreateTreePermission = true;

    if (!hasCreateTreePermission) {
      res.status(403).json({
        error: 'Tree creation not available',
        message: 'Please upgrade your subscription to create new trees'
      });
      return;
    }

    console.log(`✅Tree creation permission granted for user: ${req.user.email}`);
    next();
};