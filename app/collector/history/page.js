'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';
import Toast from '@/components/Toast';

export default function CollectorHistory() {
    const { data: session } = useSession();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchHistory(); }, []);

    async function fetchHistory() {
        setLoading(true);
        try {
            const res = await fetch('/api/collector/history');
            const data = await res.json();
            if (res.ok) setPayments(data || []);
        } catch (err) {
            console.error('Fetch history error:', err);
        } finally { setLoading(false); }
    }

    function openEdit(payment) {
        setEditingPayment(payment);
        setEditForm({
            receivedAmount: payment.receivedAmount || '',
            expectedAmount: payment.expectedAmount || '',
            status: payment.status || 'unpaid',
            paymentMode: payment.paymentMode || 'cash',
            notes: payment.notes || '',
            collectionDate: payment.collectionDate || '',
        });
    }

    async function handleEditSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            // Recalculate status based on amounts
            const recv = parseFloat(editForm.receivedAmount) || 0;
            const exp = parseFloat(editForm.expectedAmount) || 0;
            let status = 'unpaid';
            if (recv >= exp && exp > 0) status = 'paid';
            else if (recv > 0) status = 'partial';

            const res = await fetch('/api/db/rentPayments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingPayment.id,
                    receivedAmount: recv.toString(),
                    expectedAmount: editForm.expectedAmount,
                    status,
                    paymentMode: editForm.paymentMode,
                    notes: editForm.notes,
                    collectionDate: editForm.collectionDate,
                }),
            });
            if (!res.ok) throw new Error('Update failed');
            setToast({ message: 'Entry updated!', type: 'success' });
            setEditingPayment(null);
            fetchHistory();
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally { setSaving(false); }
    }

    const totalCollected = payments.reduce((s, p) => s + Number(p.receivedAmount || 0), 0);
    const modeBreakdown = payments.reduce((acc, p) => {
        const mode = p.paymentMode || 'cash';
        acc[mode] = (acc[mode] || 0) + Number(p.receivedAmount || 0);
        return acc;
    }, {});

    const modeIcons = { cash: '💵', cheque: '📝', online: '📱' };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>My Collection History</h1>
                <p>All payments you've recorded — click to edit</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Records</span>
                    <span className="stat-value">{payments.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Collected</span>
                    <span className="stat-value">₹{totalCollected.toLocaleString()}</span>
                </div>
                {Object.entries(modeBreakdown).map(([mode, amount]) => (
                    <div key={mode} className="stat-card">
                        <span className="stat-label">{modeIcons[mode] || '💰'} {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                        <span className="stat-value">₹{Number(amount).toLocaleString()}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : payments.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📋</div><p>No collections yet</p></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Renter</th>
                                <th>Name</th>
                                <th>Month</th>
                                <th>Expected</th>
                                <th>Received</th>
                                <th>Mode</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>
                                        {p.renters?.renterCode || '—'}
                                    </td>
                                    <td>{p.renters?.name || '—'}</td>
                                    <td>{p.periodMonth}</td>
                                    <td>₹{Number(p.expectedAmount || 0).toLocaleString()}</td>
                                    <td style={{ fontWeight: 600 }}>₹{Number(p.receivedAmount || 0).toLocaleString()}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                            background: p.paymentMode === 'cheque' ? 'rgba(245,158,11,0.15)' : p.paymentMode === 'online' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                                            color: p.paymentMode === 'cheque' ? '#f59e0b' : p.paymentMode === 'online' ? '#818cf8' : '#10b981',
                                        }}>
                                            {modeIcons[p.paymentMode] || '💵'} {(p.paymentMode || 'cash').toUpperCase()}
                                        </span>
                                    </td>
                                    <td><StatusBadge status={p.status} /></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {p.collectionDate ? new Date(p.collectionDate).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                                            ✏️ Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editingPayment && (
                <div className="modal-overlay" onClick={() => setEditingPayment(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Payment Entry</h2>
                            <button className="modal-close" onClick={() => setEditingPayment(null)}>×</button>
                        </div>
                        <form onSubmit={handleEditSave}>
                            <div style={{ padding: '8px 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <strong>{editingPayment.renters?.renterCode}</strong> — {editingPayment.renters?.name} — {editingPayment.periodMonth}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Expected Amount (₹)</label>
                                    <input className="form-input" type="number" step="0.01" value={editForm.expectedAmount}
                                        onChange={(e) => setEditForm({ ...editForm, expectedAmount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Received Amount (₹)</label>
                                    <input className="form-input" type="number" step="0.01" value={editForm.receivedAmount}
                                        onChange={(e) => setEditForm({ ...editForm, receivedAmount: e.target.value })} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Mode</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['cash', 'cheque', 'online'].map(mode => (
                                        <button key={mode} type="button" onClick={() => setEditForm({ ...editForm, paymentMode: mode })}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                                                border: editForm.paymentMode === mode ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                background: editForm.paymentMode === mode ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                color: editForm.paymentMode === mode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                fontWeight: editForm.paymentMode === mode ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize',
                                            }}>
                                            {modeIcons[mode]} {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Collection Date</label>
                                    <input className="form-input" type="date" value={editForm.collectionDate}
                                        onChange={(e) => setEditForm({ ...editForm, collectionDate: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <input className="form-input" value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Any remarks..." />
                            </div>

                            <div className="modal-actions" style={{ marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingPayment(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : '💾 Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
