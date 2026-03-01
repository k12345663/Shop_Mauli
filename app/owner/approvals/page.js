'use client';

import { useState, useEffect } from 'react';
import Toast from '@/components/Toast';

export default function OwnerApprovalsPage() {
    const [pending, setPending] = useState([]);
    const [approved, setApproved] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    useEffect(() => { fetchUsers(); }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch('/api/db/profiles');
            const data = await res.json();
            if (res.ok) {
                const all = data || [];
                setPending(all.filter(u => !u.isApproved));
                setApproved(all.filter(u => u.isApproved));
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function approveUser(id) {
        try {
            const res = await fetch('/api/db/profiles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isApproved: true }),
            });
            if (!res.ok) throw new Error('Approval failed');
            setToast({ message: '✅ User approved!', type: 'success' });
            fetchUsers();
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        }
    }

    async function revokeUser(id) {
        try {
            const res = await fetch('/api/db/profiles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isApproved: false }),
            });
            if (!res.ok) throw new Error('Revocation failed');
            setToast({ message: 'Access revoked', type: 'success' });
            fetchUsers();
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        }
    }

    const RoleTag = ({ role }) => {
        const colors = {
            admin: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
            collector: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
            owner: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        };
        const s = colors[role] || {};
        return (
            <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color }}>
                {role?.toUpperCase()}
            </span>
        );
    };

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>User Approvals</h1>
                <p>Approve or revoke access to RentFlow</p>
            </div>

            {/* Pending */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    ⏳ Pending Approval
                    {pending.length > 0 && (
                        <span style={{ background: 'var(--status-unpaid-bg)', color: 'var(--status-unpaid)', padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700 }}>
                            {pending.length}
                        </span>
                    )}
                </h3>

                {pending.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                        ✅ No pending approvals
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Name</th><th>Role</th><th>Signed Up</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {pending.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 600 }}>{u.fullName || '—'}</td>
                                        <td><RoleTag role={u.role} /></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td>
                                            <button className="btn btn-primary btn-sm" onClick={() => approveUser(u.id)}>
                                                ✅ Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approved */}
            <div>
                <h3 style={{ marginBottom: '16px' }}>✅ Approved Users ({approved.length})</h3>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>Name</th><th>Role</th><th>Joined</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {approved.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 600 }}>{u.fullName || '—'}</td>
                                    <td><RoleTag role={u.role} /></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => revokeUser(u.id)}>
                                            🔒 Revoke
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
