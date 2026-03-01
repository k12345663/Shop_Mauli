'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('collector');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSignup(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName, role }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Signup failed');
            }

            // After signup, automatically sign them in
            const authRes = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (authRes?.error) {
                router.push('/login');
            } else {
                router.push('/');
            }
        } catch (err) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card animate-in">
                <h1>🏢 RentFlow</h1>
                <p className="auth-subtitle">Create a new account</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSignup}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Rahul Patil"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

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
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select
                            className="form-select"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="collector">Rent Collector</option>
                            <option value="admin">Admin / DBA</option>
                            <option value="owner">Owner (Analytics)</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? 'Creating account...' : '🚀 Create Account'}
                    </button>
                </form>

                <Link href="/login" className="auth-link">
                    Already have an account? Sign In
                </Link>
            </div>
        </div>
    );
}
