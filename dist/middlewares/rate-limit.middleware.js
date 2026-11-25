"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetLoginAttempts = exports.registerFailedLogin = exports.checkLoginLockout = void 0;
const response_util_1 = require("../utils/response.util");
const loginAttempts = new Map();
const checkLoginLockout = (req, res, next) => {
    const username = req.body.username;
    if (!username) {
        return next();
    }
    const record = loginAttempts.get(username);
    if (record && record.lockedUntil && record.lockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((record.lockedUntil - Date.now()) / (60 * 1000));
        (0, response_util_1.sendError)(res, `Akun sementara terkunci karena 5 kali percobaan gagal berturut-turut. Silakan coba lagi dalam ${remainingMinutes} menit.`, 429, 'ACCOUNT_LOCKED');
        return;
    }
    next();
};
exports.checkLoginLockout = checkLoginLockout;
const registerFailedLogin = (username) => {
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
exports.registerFailedLogin = registerFailedLogin;
const resetLoginAttempts = (username) => {
    loginAttempts.delete(username);
};
exports.resetLoginAttempts = resetLoginAttempts;
