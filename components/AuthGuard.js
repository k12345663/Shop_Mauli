'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children, allowedRoles }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('checking'); // checking | authorized | pending | unauthorized

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_approved')
                .eq('id', user.id)
                .single();

            if (!profile) {
                router.push('/login');
                return;
            }

            // Wrong role — redirect to correct dashboard
            if (!allowedRoles.includes(profile.role)) {
                router.push(`/${profile.role}`);
                return;
            }

            // Correct role but not approved yet
            if (!profile.is_approved) {
                setStatus('pending');
                setLoading(false);
                return;
            }

            setStatus('authorized');
        } catch (err) {
            console.error('Auth check failed:', err);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    if (loading) {
        return (
            <div className="loading-page">
                <div className="spinner"></div>
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="auth-container">
                <div className="auth-card animate-in" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                    <h1 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Awaiting Approval</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
                        Your account has been created and is pending approval by the admin.
                        You'll be able to login once approved.
                    </p>
                    <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
                        🚪 Sign Out
                    </button>
                </div>
            </div>
        );
    }

    if (status !== 'authorized') return null;

    return <>{children}</>;
}
