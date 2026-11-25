"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_util_1 = require("../utils/jwt.util");
const response_util_1 = require("../utils/response.util");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, response_util_1.sendError)(res, 'Token autentikasi tidak ditemukan atau tidak valid', 401, 'UNAUTHORIZED');
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_util_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            (0, response_util_1.sendError)(res, 'Access token telah kedaluwarsa, silakan lakukan refresh token', 401, 'TOKEN_EXPIRED');
            return;
        }
        (0, response_util_1.sendError)(res, 'Token autentikasi tidak valid', 401, 'INVALID_TOKEN');
    }
};
exports.authenticate = authenticate;
