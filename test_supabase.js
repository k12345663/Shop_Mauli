const { createClient } = require('@supabase/supabase-js');

async function testConnection(url, key) {
    try {
        console.log(`Testing URL: ${url}`);
        const supabase = createClient(url, key);
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.error(`  Result: Error - ${error.message} (Code: ${error.code})`);
        } else {
            console.log(`  Result: SUCCESS!`);
        }
    } catch (err) {
        console.error(`  Result: Crash - ${err.message}`);
    }
}

const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enl3a3JrYm91bXN2ZWJua3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODY2OTMsImV4cCI6MjA4NzI2MjY5M30.R758X40kQaV8g8MlomA8EOBekEldeMSBaptATeMweCE';

(async () => {
    await testConnection('https://zuzywkrkboumsvebnkzz.supabase.co', key);
    await testConnection('https://zuzywkrkboumvebnkzz.supabase.co', key);
})();
