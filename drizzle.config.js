const { defineConfig } = require('drizzle-kit');
require('dotenv').config({ path: '.env.local' });

module.exports = defineConfig({
    schema: './lib/db/schema.js',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
