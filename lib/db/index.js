const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const schema = require('./schema');

const sql = neon(process.env.DATABASE_URL || "postgres://dummy:dummy@dummy.neon.tech/dummy");
const db = drizzle(sql, { schema });

module.exports = { db };
