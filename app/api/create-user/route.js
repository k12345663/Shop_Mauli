import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Admin client getter — server side only
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zuzywkrkboumsvebnkzz.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1enl3a3JrYm91bXN2ZWJua3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4NjY5MywiZXhwIjoyMDg3MjYyNjkzfQ._5vza7YcJHTxsXuw6loatsE42tQLrXMNjyOY_X_SRw4';

    if (!url || !key) {
        throw new Error('Supabase URL or Service Role Key is missing');
    }

    return createClient(url, key);
}

export async function POST(request) {
    try {
        const { fullName, email, password, role } = await request.json();

        if (!fullName || !email || !password || !role) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        // Create user in Supabase Auth using admin API
        const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,   // auto-confirm email
            user_metadata: { full_name: fullName, role },
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        // Ensure profile row exists and is approved
        await supabaseAdmin.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            role,
            is_approved: true,
        });

        return NextResponse.json({ success: true, userId: data.user.id });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { userId } = await request.json();
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

        // 2. Delete from Profiles (fallback, though ON DELETE CASCADE should handle it)
        const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
        if (profileError) {
            console.error('Profile deletion error:', profileError.message);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
