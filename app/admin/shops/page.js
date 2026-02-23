'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

export default function ManageShops() {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingShop, setEditingShop] = useState(null);
    const [form, setForm] = useState({ shop_no: '', category: 'Numeric', complex: 'New Complex', rent_amount: '', rent_collection_day: '1' });
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedTab, setSelectedTab] = useState('All');

    useEffect(() => { fetchShops(); }, []);

    async function fetchShops() {
        setLoading(true);
        const { data } = await supabase
            .from('shops')
            .select('*')
            .order('shop_no', { ascending: true });
        setShops(data || []);
        setLoading(false);
    }

    function openAdd() {
        setEditingShop(null);
        setForm({
            shop_no: '',
            category: 'Numeric',
            complex: selectedTab === 'All' ? 'New Complex' : selectedTab,
            rent_amount: '',
            rent_collection_day: '1'
        });
        setShowModal(true);
    }

    function openEdit(shop) {
        setForm({
            shop_no: shop.shop_no,
            category: shop.category || 'Numeric',
            complex: shop.complex || 'New Complex',
            rent_amount: shop.rent_amount.toString(),
            rent_collection_day: (shop.rent_collection_day || 1).toString()
        });
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        const payload = {
            shop_no: form.shop_no.trim(),
            category: form.category,
            complex: form.complex,
            rent_amount: parseFloat(form.rent_amount),
            rent_collection_day: parseInt(form.rent_collection_day),
        };

        if (editingShop) {
            const { error } = await supabase.from('shops').update(payload).eq('id', editingShop.id);
            if (error) { setToast({ message: error.message, type: 'error' }); return; }
            setToast({ message: 'Shop updated', type: 'success' });
        } else {
            const { error } = await supabase.from('shops').insert(payload);
            if (error) { setToast({ message: error.message, type: 'error' }); return; }
            setToast({ message: 'Shop added', type: 'success' });
        }

        setShowModal(false);
        fetchShops();
    }

    async function toggleActive(shop) {
        await supabase.from('shops').update({ is_active: !shop.is_active }).eq('id', shop.id);
        fetchShops();
    }

    async function handleDelete(id) {
        // Check if assigned first
        const { data: assignments } = await supabase.from('renter_shops').select('id').eq('shop_id', id);

        const msg = (assignments && assignments.length > 0)
            ? `WARNING: This shop is currently assigned to a renter. Deleting it will remove the assignment. Proceed?`
            : 'Delete this shop?';

        if (!confirm(msg)) return;

        const { error } = await supabase.from('shops').delete().eq('id', id);
        if (error) { setToast({ message: error.message, type: 'error' }); return; }
        setToast({ message: 'Shop deleted', type: 'success' });
        fetchShops();
    }

    const filtered = shops.filter(s => {
        const matchesSearch = s.shop_no.toLowerCase().includes(search.toLowerCase());
        const matchesTab = selectedTab === 'All' || s.complex === selectedTab;
        return matchesSearch && matchesTab;
    });

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Manage Shops</h1>
                <p>Add, edit, or remove shops</p>
            </div>

            <div className="toolbar">
                <div className="search-container" style={{ marginBottom: 0, flex: 1, maxWidth: 400 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        className="search-input"
                        placeholder="Search by shop number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    ➕ Add Shop
                </button>
            </div>

            <div className="tabs-container" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                {['All', 'Pump', 'New Complex', 'Tower'].map(tab => (
                    <button
                        key={tab}
                        className={`tab-btn ${selectedTab === tab ? 'active' : ''}`}
                        onClick={() => setSelectedTab(tab)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            background: selectedTab === tab ? 'var(--accent-primary)' : 'transparent',
                            color: selectedTab === tab ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏪</div>
                    <p>No shops found</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Shop No</th>
                                <th>Complex</th>
                                <th>Category</th>
                                <th>Assigned To</th>
                                <th>Rent (₹)</th>
                                <th>Collection Day</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((shop) => (
                                <tr key={shop.id}>
                                    <td style={{ fontWeight: 600 }}>{shop.shop_no}</td>
                                    <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{shop.complex || 'New Complex'}</td>
                                    <td>
                                        <span className="shop-tag" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                            {shop.category || 'Numeric'}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {shop.renter_shops && shop.renter_shops.length > 0
                                            ? shop.renter_shops[0].renters?.name
                                            : <span style={{ opacity: 0.5 }}>Unassigned</span>}
                                    </td>
                                    <td>₹{Number(shop.rent_amount).toLocaleString()}</td>
                                    <td>Day {shop.rent_collection_day}</td>
                                    <td>
                                        <span className={`badge ${shop.is_active ? 'badge-paid' : 'badge-unpaid'}`}>
                                            {shop.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(shop)}>✏️</button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(shop)}>
                                                {shop.is_active ? '🔴' : '🟢'}
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(shop.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingShop ? 'Edit Shop' : 'Add Shop'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label className="form-label">Select Complex</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    {['Pump', 'New Complex', 'Tower'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setForm({ ...form, complex: c })}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: 'var(--radius-md)',
                                                border: `2px solid ${form.complex === c ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                background: form.complex === c ? 'var(--accent-glow)' : 'transparent',
                                                color: form.complex === c ? 'var(--accent-primary-hover)' : 'var(--text-secondary)',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Select Category</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    {[
                                        { id: 'Numeric', label: 'Numeric' },
                                        { id: 'B', label: 'B' },
                                        { id: 'G', label: 'G' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, category: cat.id })}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: 'var(--radius-md)',
                                                border: `2px solid ${form.category === cat.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                background: form.category === cat.id ? 'var(--accent-glow)' : 'transparent',
                                                color: form.category === cat.id ? 'var(--accent-primary-hover)' : 'var(--text-secondary)',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Shop Number</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g. B-01, G-01, or 01"
                                    value={form.shop_no}
                                    onChange={(e) => setForm({ ...form, shop_no: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Monthly Rent (₹)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    placeholder="e.g. 5000"
                                    value={form.rent_amount}
                                    onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rent Collection Day (1-31)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    max="31"
                                    placeholder="e.g. 1"
                                    value={form.rent_collection_day}
                                    onChange={(e) => setForm({ ...form, rent_collection_day: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingShop ? 'Update' : 'Add Shop'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
