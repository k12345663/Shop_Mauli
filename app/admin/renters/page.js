'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

export default function ManageRenters() {
    const [renters, setRenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRenter, setEditingRenter] = useState(null);
    const [form, setForm] = useState({ renter_code: '', name: '', phone: '' });
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => { fetchRenters(); }, []);

    async function fetchRenters() {
        setLoading(true);
        const { data } = await supabase
            .from('renters')
            .select('*, renter_shops(shop_id, shops(shop_no, complex, rent_amount))')
            .order('renter_code', { ascending: true });
        setRenters(data || []);
        setLoading(false);
    }

    function openAdd() {
        setEditingRenter(null);
        setForm({ renter_code: '', name: '', phone: '' });
        setShowModal(true);
    }

    function openEdit(renter) {
        setEditingRenter(renter);
        setForm({ renter_code: renter.renter_code, name: renter.name, phone: renter.phone || '' });
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        const payload = {
            renter_code: form.renter_code.trim(),
            name: form.name.trim(),
            phone: form.phone.trim(),
        };

        if (editingRenter) {
            const { error } = await supabase.from('renters').update(payload).eq('id', editingRenter.id);
            if (error) { setToast({ message: error.message, type: 'error' }); return; }
            setToast({ message: 'Renter updated', type: 'success' });
        } else {
            const { error } = await supabase.from('renters').insert(payload);
            if (error) { setToast({ message: error.message, type: 'error' }); return; }
            setToast({ message: 'Renter added', type: 'success' });
        }

        setShowModal(false);
        fetchRenters();
    }

    async function updateShopRent(id, amount) {
        if (!amount || isNaN(amount)) return;
        setLoading(true);
        const { error } = await supabase.from('shops').update({ rent_amount: parseFloat(amount) }).eq('id', id);
        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: 'Rent amount updated', type: 'success' });
            fetchRenters();
        }
        setLoading(false);
    }

    async function handleDelete(id) {
        if (!confirm('Delete this renter and all their shop assignments?')) return;
        const { error } = await supabase.from('renters').delete().eq('id', id);
        if (error) { setToast({ message: error.message, type: 'error' }); return; }
        setToast({ message: 'Renter deleted', type: 'success' });
        fetchRenters();
    }

    const filtered = renters.filter(r =>
        r.renter_code.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Manage Renters</h1>
                <p>Edit renter details and manage shop rents</p>
            </div>

            <div className="toolbar">
                <div className="search-container" style={{ marginBottom: 0, flex: 1, maxWidth: 400 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        className="search-input"
                        placeholder="Search by renter code or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    ➕ Add Renter
                </button>
            </div>

            {loading && !showModal ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <p>No renters found</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Renter Code</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Assigned Shops</th>
                                <th>Total Rent (₹)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((renter) => {
                                return (
                                    <tr key={renter.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{renter.renter_code}</td>
                                        <td>{renter.name}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{renter.phone || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {renter.renter_shops?.length > 0 ? renter.renter_shops.map(rs => (
                                                    <div key={rs.shops?.shop_no} className="shop-tag" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px 10px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{rs.shops?.complex} - {rs.shops?.shop_no}</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>₹{Number(rs.shops?.rent_amount).toLocaleString()}</div>
                                                    </div>
                                                )) : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            ₹{(renter.renter_shops?.reduce((sum, rs) => sum + Number(rs.shops?.rent_amount || 0), 0) || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(renter)} title="Edit Renter & Rent">✏️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(renter.id)} title="Delete Renter">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingRenter ? 'Edit Renter Info' : 'Add Renter'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Renter Code</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. R001"
                                    value={form.renter_code}
                                    onChange={(e) => setForm({ ...form, renter_code: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. Rahul Patil"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. 9876543210"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>

                            {editingRenter && editingRenter.renter_shops?.length > 0 && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>Assigned Shop Rents</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {editingRenter.renter_shops.map(rs => (
                                            <div key={rs.shops?.shop_no} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                                                <div style={{ minWidth: '90px' }}>
                                                    <div style={{ fontWeight: 700 }}>{rs.shops?.shop_no}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rs.shops?.complex}</div>
                                                </div>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                                                        defaultValue={rs.shops?.rent_amount}
                                                        onBlur={(e) => updateShopRent(rs.shop_id, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        * Rent updates automatically when you click outside the input.
                                    </p>
                                </div>
                            )}

                            <div className="modal-actions" style={{ marginTop: '32px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingRenter ? 'Save Profile' : 'Add Renter'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
