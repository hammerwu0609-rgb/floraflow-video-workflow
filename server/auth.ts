import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import type { Role, User } from '../src/types.js';
import { mockUsers, getPasswordOverride } from './db.js';

export interface AuthAccount {
  username: string;
  passwordHash: string;
  role: Role;
}

declare module 'express-session' {
  interface SessionData {
    userId: Role;
    username: string;
  }
}

const accountDefs: { userEnv: string; passEnv: string; role: Role; defaultUser: string; defaultPass: string }[] = [
  { userEnv: 'AUTH_EDITOR_USER', passEnv: 'AUTH_EDITOR_PASS', role: 'editor', defaultUser: 'chris', defaultPass: 'FloraFlow@2026' },
  { userEnv: 'AUTH_AIGC_USER', passEnv: 'AUTH_AIGC_PASS', role: 'aigc', defaultUser: 'alex', defaultPass: 'FloraFlow@2026' },
  { userEnv: 'AUTH_AIGC2_USER', passEnv: 'AUTH_AIGC2_PASS', role: 'aigc2', defaultUser: 'alex2', defaultPass: 'FloraFlow@2026' },
  { userEnv: 'AUTH_AIGC3_USER', passEnv: 'AUTH_AIGC3_PASS', role: 'aigc3', defaultUser: 'alex3', defaultPass: 'FloraFlow@2026' },
  { userEnv: 'AUTH_AUDIO_USER', passEnv: 'AUTH_AUDIO_PASS', role: 'audio', defaultUser: 'sam', defaultPass: 'FloraFlow@2026' },
  { userEnv: 'AUTH_AUDIO2_USER', passEnv: 'AUTH_AUDIO2_PASS', role: 'audio2', defaultUser: 'sam2', defaultPass: 'FloraFlow@2026' },
  { userEnv: 'AUTH_AUDIO3_USER', passEnv: 'AUTH_AUDIO3_PASS', role: 'audio3', defaultUser: 'sam3', defaultPass: 'FloraFlow@2026' },
];

let cachedAccounts: AuthAccount[] | null = null;

export function getAccounts(): AuthAccount[] {
  if (!cachedAccounts) {
    cachedAccounts = accountDefs.map(def => {
      const username = process.env[def.userEnv] || def.defaultUser;
      const override = getPasswordOverride(username);
      return {
        username,
        passwordHash: override || bcrypt.hashSync(process.env[def.passEnv] || def.defaultPass, 10),
        role: def.role,
      };
    });
  }
  return cachedAccounts;
}

export function findAccount(username: string): AuthAccount | undefined {
  return getAccounts().find(a => a.username === username);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function getSessionUser(req: Request): User | null {
  if (!req.session.userId) return null;
  return mockUsers[req.session.userId];
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId || !roles.includes(req.session.userId)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }
    next();
  };
}

export function clearAccountsCache(): void {
  cachedAccounts = null;
}

export function canClaimTask(_role: Role, _taskType: string): boolean {
  return true;
}
