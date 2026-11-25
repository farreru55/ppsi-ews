"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const response_util_1 = require("../utils/response.util");
const zod_1 = require("zod");
const errorHandler = (err, req, res, next) => {
    const requestId = req.requestId || (res.locals && res.locals.requestId) || `req_${Date.now()}`;
    res.locals.requestId = requestId;
    // Handle Zod validation error
    if (err instanceof zod_1.ZodError) {
        (0, response_util_1.sendError)(res, 'Validasi input gagal', 422, 'VALIDATION_ERROR', err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })));
        return;
    }
    // Handle syntax error (e.g. invalid JSON payload)
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        (0, response_util_1.sendError)(res, 'Payload JSON tidak valid', 400, 'MALFORMED_JSON');
        return;
    }
    // Handle custom status errors
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Terjadi kesalahan internal pada server';
    const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
    console.error(`[ERROR] [${requestId}] ${req.method} ${req.originalUrl}:`, err);
    (0, response_util_1.sendError)(res, message, statusCode, code, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};
exports.errorHandler = errorHandler;
