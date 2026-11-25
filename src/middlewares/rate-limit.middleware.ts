import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';

interface LoginAttemptRecord {
  attempts: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttemptRecord>();

export const checkLoginLockout = (req: Request, res: Response, next: NextFunction): void => {
  const username = req.body.username;
  if (!username) {
    return next();
  }

  const record = loginAttempts.get(username);
  if (record && record.lockedUntil && record.lockedUntil > Date.now()) {
    const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / (60 * 1000));
    sendError(
      res,
      `Akun sementara terkunci karena 5 kali percobaan gagal berturut-turut. Silakan coba lagi dalam ${remainingMinutes} menit.`,
      429,
      'ACCOUNT_LOCKED'
    );
    return;
  }

  next();
};

export const registerFailedLogin = (username: string): { locked: boolean; remainingAttempts: number } => {
  const now = Date.now();
  const current = loginAttempts.get(username) || { attempts: 0 };
  
  current.attempts += 1;
  if (current.attempts >= 5) {
    current.lockedUntil = now + 15 * 60 * 1000; // 15 menit
    loginAttempts.set(username, current);
    return { locked: true, remainingAttempts: 0 };
  }

  loginAttempts.set(username, current);
  return { locked: false, remainingAttempts: 5 - current.attempts };
};

export const resetLoginAttempts = (username: string): void => {
  loginAttempts.delete(username);
};
