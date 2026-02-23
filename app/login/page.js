'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Attempting login for:', email);
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                console.error('Auth Error:', authError.message);
                throw authError;
            }

            console.log('Auth success, fetching profile for ID:', data.user.id);
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, is_approved')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('Profile Fetch Error:', profileError.message);
                setError('Login succeeded but your profile was not found. Please sign up again.');
                return;
            }

            if (!profile.is_approved) {
                setError('Your account is pending approval by the owner.');
                return;
            }

            console.log('Login successful! Role:', profile.role);
            const targetPath = profile.role === 'owner' ? '/admin' : `/${profile.role}`;
            router.push(targetPath);
        } catch (err) {
            console.error('Login Process Error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card animate-in">
                <h1>🏢 RentFlow</h1>
                <p className="auth-subtitle">Sign in to your account</p>

                {error && <div className="auth-error">{error}</div>}

                {/* Debug info - temporary */}
                {process.env.NODE_ENV === 'production' && (
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px', textAlign: 'center' }}>
                        Connected to: {process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0] || 'Unknown'}...
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? 'Signing in...' : '🔑 Sign In'}
                    </button>
                </form>


            </div>
        </div>
    );
}
