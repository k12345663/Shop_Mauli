import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Admin client using service role — server side only
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    try {
        const { fullName, email, password, role } = await request.json();

        if (!fullName || !email || !password || !role) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

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
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
