import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';
import { sendError } from '../utils/response.util';

export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.api_key as string);
  
  if (!apiKey || apiKey !== env.INTEGRATION_API_KEY) {
    sendError(res, 'API Key integrasi tidak valid atau tidak disertakan', 401, 'INVALID_API_KEY');
    return;
  }

  next();
};
