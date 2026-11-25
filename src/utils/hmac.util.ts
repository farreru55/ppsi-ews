import crypto from 'crypto';
import { env } from '../config/environment';

export const generateHmacSignature = (payload: string, secret = env.AI_ADVISOR_HMAC_SECRET): string => {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

export const verifyHmacSignature = (
  payload: string,
  signature: string,
  secret = env.AI_ADVISOR_HMAC_SECRET
): boolean => {
  if (!signature) return false;
  const expected = generateHmacSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
};
