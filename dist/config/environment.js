"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    // Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
    DB_USER: process.env.DB_USER || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'root',
    DB_NAME: process.env.DB_NAME || 'ews_db',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/ews_db',
    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'ews_super_secret_access_token_key_2026',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'ews_super_secret_refresh_token_key_2026',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    // Integrations
    INTEGRATION_API_KEY: process.env.INTEGRATION_API_KEY || 'ews_smart_university_integration_api_key_xyz987',
    AI_ADVISOR_URL: process.env.AI_ADVISOR_URL || 'https://ai-advisor.internal.campus/api',
    AI_ADVISOR_HMAC_SECRET: process.env.AI_ADVISOR_HMAC_SECRET || 'ews_ai_advisor_shared_secret_signature_key',
    // Notifications
    WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || 'https://api.fonnte.com/send',
    WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN || 'mock_fonnte_token',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '2525', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || 'ews-noreply@dinamika.ac.id',
};
