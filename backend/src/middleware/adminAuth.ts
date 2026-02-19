import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Read env vars lazily (after dotenv.config() has run in index.ts)
function getJwtSecret(): string {
    return process.env.JWT_SECRET || 'techtitan-admin-secret-change-me';
}

function getAdminPassword(): string {
    return process.env.ADMIN_PASSWORD || 'admin123';
}

export interface AuthRequest extends Request {
    isAdmin?: boolean;
}

/**
 * Middleware to verify JWT token for admin routes
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, getJwtSecret()) as any;
        if (decoded.role !== 'admin') {
            res.status(403).json({ error: 'Access denied. Not an admin.' });
            return;
        }
        req.isAdmin = true;
        next();
    } catch (error) {
        logger.warn('Invalid admin token attempt');
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

/**
 * Login handler - validates password and returns JWT
 */
export function loginHandler(req: Request, res: Response): void {
    const { password } = req.body;
    const adminPassword = getAdminPassword();

    if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
    }

    // Use String() to handle type differences (number vs string)
    if (String(password).trim() !== String(adminPassword).trim()) {
        logger.warn('Failed admin login attempt');
        res.status(401).json({ error: 'Invalid password' });
        return;
    }

    const token = jwt.sign(
        { role: 'admin', loginTime: Date.now() },
        getJwtSecret(),
        { expiresIn: '24h' }
    );

    logger.info('Admin logged in successfully');
    res.json({
        success: true,
        token,
        expiresIn: '24h',
    });
}
