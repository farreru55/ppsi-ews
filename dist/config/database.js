"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const environment_1 = require("./environment");
exports.pool = new pg_1.Pool({
    host: environment_1.env.DB_HOST,
    port: environment_1.env.DB_PORT,
    user: environment_1.env.DB_USER,
    password: environment_1.env.DB_PASSWORD,
    database: environment_1.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
const query = async (text, params) => {
    const start = Date.now();
    const res = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (environment_1.env.NODE_ENV === 'development' && duration > 500) {
        console.warn(`Slow query (${duration}ms):`, text);
    }
    return res;
};
exports.query = query;
const withTransaction = async (callback) => {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
};
exports.withTransaction = withTransaction;
