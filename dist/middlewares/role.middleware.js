"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = void 0;
const response_util_1 = require("../utils/response.util");
const requireRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_util_1.sendError)(res, 'Autentikasi diperlukan', 401, 'UNAUTHORIZED');
            return;
        }
        const userRoles = req.user.roles || [];
        const hasRole = userRoles.some((role) => allowedRoles.includes(role));
        if (!hasRole) {
            (0, response_util_1.sendError)(res, `Akses ditolak. Endpoint ini membutuhkan peran: ${allowedRoles.join(', ')}`, 403, 'FORBIDDEN');
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
