const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fivem',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = {
    query: async (sql, params) => {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('[DB ERROR]', error);
            throw error;
        }
    },
    getConnection: async () => {
        return await pool.getConnection();
    }
};
