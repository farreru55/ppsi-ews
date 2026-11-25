import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Autentikasi diperlukan', 401, 'UNAUTHORIZED');
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      sendError(
        res,
        `Akses ditolak. Endpoint ini membutuhkan peran: ${allowedRoles.join(', ')}`,
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
};
