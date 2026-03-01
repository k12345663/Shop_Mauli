'use client';

import { useState, useEffect } from 'react';
import Toast from '@/components/Toast';

const ROLES = [
    { value: 'collector', label: '🧾 Rent Collector' },
    { value: 'admin', label: '🛠️ Admin / DBA' },
    { value: 'owner', label: '👑 Owner' },
];

export default function ManageUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'collector' });

    useEffect(() => { fetchUsers(); }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (res.ok) {
                setUsers(data || []);
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: form.fullName,
                    email: form.email,
                    password: form.password,
                    role: form.role,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setToast({ message: `✅ ${form.fullName} (${form.role}) created!`, type: 'success' });
            setForm({ fullName: '', email: '', password: '', role: 'collector' });
            setShowForm(false);
            fetchUsers();
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(user) {
        if (!confirm(`Delete account for "${user.fullName}"? This cannot be undone.`)) return;
        const res = await fetch('/api/create-user', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
        });
        const result = await res.json();
        if (!res.ok) { setToast({ message: result.error, type: 'error' }); return; }
        setToast({ message: 'User deleted', type: 'success' });
        fetchUsers();
    }

    const RoleTag = ({ role }) => {
        const map = {
            admin: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
            collector: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
            owner: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        };
        const s = map[role] || {};
        return (
            <span style={{ padding: '3px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color }}>
                {role?.toUpperCase()}
            </span>
        );
    };

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1>Manage Users</h1>
                    <p>Create and manage who has access to RentFlow</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + Add User
                </button>
            </div>

            {/* Create User Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>➕ Create New User</h2>
                            <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
                        </div>

                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input className="form-input" placeholder="e.g. Rahul Patil" value={form.fullName}
                                    onChange={e => setForm({ ...form, fullName: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" placeholder="user@example.com" value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-select" value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Creating...' : '✅ Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No users yet</td></tr>
                        ) : users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{u.fullName || '—'}</div>
                                </td>
                                <td><RoleTag role={u.role} /></td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                                </td>
                                <td>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>
                                        🗑 Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
