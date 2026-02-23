'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

export default function ApprovalsPage() {
    const [pending, setPending] = useState([]);
    const [approved, setApproved] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    useEffect(() => { fetchUsers(); }, []);

    async function fetchUsers() {
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        const all = data || [];
        setPending(all.filter(u => !u.is_approved));
        setApproved(all.filter(u => u.is_approved));
        setLoading(false);
    }

    async function approveUser(id) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: true })
            .eq('id', id);

        if (error) { setToast({ message: error.message, type: 'error' }); return; }
        setToast({ message: 'User approved!', type: 'success' });
        fetchUsers();
    }

    async function rejectUser(id) {
        if (!confirm('Reject and delete this user account?')) return;
        // Remove from profiles (cascades from auth.users deletion done via admin)
        await supabase.from('profiles').delete().eq('id', id);
        setToast({ message: 'User removed', type: 'success' });
        fetchUsers();
    }

    async function revokeUser(id) {
        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: false })
            .eq('id', id);
        if (error) { setToast({ message: error.message, type: 'error' }); return; }
        setToast({ message: 'Access revoked', type: 'success' });
        fetchUsers();
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
                <p>Manage access to RentFlow</p>
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
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Signed Up</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                                        <td><RoleTag role={u.role} /></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {new Date(u.created_at).toLocaleDateString('en-IN')}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => approveUser(u.id)}>✅ Approve</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => rejectUser(u.id)}>❌ Reject</button>
                                            </div>
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
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approved.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                                    <td><RoleTag role={u.role} /></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(u.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                    <td>
                                        <button className="btn btn-danger btn-sm" onClick={() => revokeUser(u.id)}>🔒 Revoke</button>
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
