const { neon } = require('@neondatabase/serverless');

async function test() {
    const url = "postgresql://neondb_owner:npg_mvEqasfh39gz@ep-little-resonance-ait3wmuv-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const sql = neon(url);
    try {
        const result = await sql`SELECT 1 as test`;
        console.log('Connection successful:', result);
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

test();
