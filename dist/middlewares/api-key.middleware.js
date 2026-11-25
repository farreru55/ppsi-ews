"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = void 0;
const environment_1 = require("../config/environment");
const response_util_1 = require("../utils/response.util");
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey || apiKey !== environment_1.env.INTEGRATION_API_KEY) {
        (0, response_util_1.sendError)(res, 'API Key integrasi tidak valid atau tidak disertakan', 401, 'INVALID_API_KEY');
        return;
    }
    next();
};
exports.requireApiKey = requireApiKey;
