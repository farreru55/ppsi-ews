"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message, statusCode = 200, pagination) => {
    const response = {
        success: true,
        data,
        message,
        pagination,
    };
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 400, code = 'BAD_REQUEST', details) => {
    const response = {
        success: false,
        message,
        code,
        requestId: (res.locals && res.locals.requestId) || `req_${Date.now()}`,
        data: details,
    };
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
