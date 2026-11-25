"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHmacSignature = exports.generateHmacSignature = void 0;
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../config/environment");
const generateHmacSignature = (payload, secret = environment_1.env.AI_ADVISOR_HMAC_SECRET) => {
    return crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
};
exports.generateHmacSignature = generateHmacSignature;
const verifyHmacSignature = (payload, signature, secret = environment_1.env.AI_ADVISOR_HMAC_SECRET) => {
    if (!signature)
        return false;
    const expected = (0, exports.generateHmacSignature)(payload, secret);
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    }
    catch {
        return false;
    }
};
exports.verifyHmacSignature = verifyHmacSignature;
