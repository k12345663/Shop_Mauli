'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }) {
    const [role, setRole] = useState('admin');

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) setRole(profile.role);
            }
        });
    }, []);

    return (
        <AuthGuard allowedRoles={['admin', 'owner', 'dba']}>
            <div className="app-layout">
                <Sidebar role={role} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
