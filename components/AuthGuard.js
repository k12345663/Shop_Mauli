import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function AuthGuard({ children, allowedRoles }) {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const [status, setStatus] = useState('checking'); // checking | authorized | pending | unauthorized

    useEffect(() => {
        if (authStatus === 'loading') return;

        if (authStatus === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (session?.user) {
            const profile = session.user; // We'll map role/isApproved to user object in JWT callback

            // Wrong role — redirect to correct dashboard
            if (allowedRoles && !allowedRoles.includes(profile.role)) {
                router.push(`/${profile.role}`);
                return;
            }

            // Correct role but not approved yet
            if (profile.is_approved === false) {
                setStatus('pending');
                return;
            }

            setStatus('authorized');
        }
    }, [session, authStatus, router, allowedRoles]);

    async function handleLogout() {
        await signOut({ callbackUrl: '/login' });
    }

    if (authStatus === 'loading' || status === 'checking') {
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
