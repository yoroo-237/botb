import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/response.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json(fail('Missing token'));
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json(fail('Invalid or expired token'));
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json(fail('Not authenticated'));
  if (req.user.role !== 'admin') return res.status(403).json(fail('Admin access required'));
  next();
}

export function requireModerator(req, res, next) {
  if (!req.user) return res.status(401).json(fail('Not authenticated'));
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json(fail('Moderator or admin access required'));
  }
  next();
}
