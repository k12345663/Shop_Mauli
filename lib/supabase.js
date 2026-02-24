// lib/supabase.js - supabase initialization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zuzywkrkboumsvebnkzz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enl3a3JrYm91bXN2ZWJua3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODY2OTMsImV4cCI6MjA4NzI2MjY5M30.R758X40kQaV8g8MlomA8EOBekEldeMSBaptATeMweCE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
