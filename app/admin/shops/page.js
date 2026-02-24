'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

export default function ManageShops() {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingShop, setEditingShop] = useState(null);
    const [complexes, setComplexes] = useState([]);
    const [showComplexModal, setShowComplexModal] = useState(false);
    const [editingComplex, setEditingComplex] = useState(null);
    const [complexForm, setComplexForm] = useState({ name: '' });

    useEffect(() => {
        fetchShops();
        fetchComplexes();
    }, []);

    async function fetchComplexes() {
        const { data } = await supabase.from('complexes').select('*').order('name');
        setComplexes(data || []);
    }

    async function fetchShops() {
        setLoading(true);
        const { data } = await supabase
            .from('shops')
            .select('*, complexes(id, name), renter_shops(renters(name))')
            .order('shop_no', { ascending: true });
        setShops(data || []);
        setLoading(false);
    }

    const [form, setForm] = useState({ shop_no: '', category: 'Numeric', complex_id: '', rent_amount: '', rent_collection_day: '1' });
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedTab, setSelectedTab] = useState('All');

    function openAdd() {
        setEditingShop(null);
        setForm({
            shop_no: '',
            category: 'Numeric',
            complex_id: complexes.find(c => c.name === selectedTab)?.id || '',
            rent_amount: '',
            rent_collection_day: '1'
        });
        setShowModal(true);
    }

    function openEdit(shop) {
        setEditingShop(shop);
        setForm({
            shop_no: shop.shop_no,
            category: shop.category || 'Numeric',
            complex_id: shop.complex_id || '',
            rent_amount: shop.rent_amount.toString(),
            rent_collection_day: (shop.rent_collection_day || 1).toString()
        });
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();

        if (!form.complex_id) {
            setToast({ message: 'Please select a complex', type: 'error' });
            return;
        }

        const payload = {
            shop_no: form.shop_no.trim(),
            category: form.category,
            complex_id: form.complex_id,
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

    async function handleSaveComplex(e) {
        e.preventDefault();
        const payload = { name: complexForm.name.trim() };

        if (editingComplex) {
            const { error } = await supabase.from('complexes').update(payload).eq('id', editingComplex.id);
            if (error) { setToast({ message: error.message, type: 'error' }); return; }
            setToast({ message: 'Complex updated', type: 'success' });
        } else {
            const { error } = await supabase.from('complexes').insert(payload);
            if (error) { setToast({ message: error.message, type: 'error' }); return; }
            setToast({ message: 'Complex added', type: 'success' });
        }

        setShowComplexModal(false);
        fetchComplexes();
        fetchShops();
    }

    async function deleteComplex(id) {
        // Check if shops exist
        const { data: linkedShops } = await supabase.from('shops').select('id').eq('complex_id', id);
        if (linkedShops && linkedShops.length > 0) {
            alert('Cannot delete complex: It contains shops. Please move or delete shops first.');
            return;
        }
        if (!confirm('Delete this complex?')) return;
        const { error } = await supabase.from('complexes').delete().eq('id', id);
        if (error) { setToast({ message: error.message, type: 'error' }); return; }
        setToast({ message: 'Complex deleted', type: 'success' });
        fetchComplexes();
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
        const matchesTab = selectedTab === 'All' || s.complexes?.name === selectedTab;
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
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => { setEditingComplex(null); setComplexForm({ name: '' }); setShowComplexModal(true); }}>
                        🏢 Manage Complexes
                    </button>
                    <button className="btn btn-primary" onClick={openAdd}>
                        ➕ Add Shop
                    </button>
                </div>
            </div>

            <div className="tabs-container" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <button
                    className={`tab-btn ${selectedTab === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedTab('All')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: selectedTab === 'All' ? 'var(--accent-primary)' : 'transparent',
                        color: selectedTab === 'All' ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                    }}
                >
                    All ({shops.length})
                </button>
                {complexes.map(comp => {
                    const count = shops.filter(s => s.complex_id === comp.id).length;
                    return (
                        <button
                            key={comp.id}
                            className={`tab-btn ${selectedTab === comp.name ? 'active' : ''}`}
                            onClick={() => setSelectedTab(comp.name)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: selectedTab === comp.name ? 'var(--accent-primary)' : 'transparent',
                                color: selectedTab === comp.name ? 'white' : 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {comp.name} ({count})
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏪</div>
                    <p>No shops found</p>
                </div>
            ) : (
                <div className="table-container" style={{ background: 'transparent', border: 'none' }}>
                    {selectedTab === 'All' && !search ? (
                        // Grouped View for "All"
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {complexes.map(comp => {
                                const compShops = shops.filter(s => s.complex_id === comp.id);
                                if (compShops.length === 0) return null;
                                return (
                                    <div key={comp.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{comp.name}</h3>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{compShops.length} Shops</span>
                                        </div>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Shop No</th>
                                                    <th>Category</th>
                                                    <th>Assigned To</th>
                                                    <th>Rent (₹)</th>
                                                    <th>Status</th>
                                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {compShops.map(shop => (
                                                    <tr key={shop.id}>
                                                        <td style={{ fontWeight: 600 }}>{shop.shop_no}</td>
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
                                                        <td>
                                                            <span className={`badge ${shop.is_active ? 'badge-paid' : 'badge-unpaid'}`}>
                                                                {shop.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                                );
                            })}
                        </div>
                    ) : (
                        // Standard Table View (Filtered or specific complex)
                        <div className="card" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Shop No</th>
                                        {selectedTab === 'All' && <th>Complex</th>}
                                        <th>Category</th>
                                        <th>Assigned To</th>
                                        <th>Rent (₹)</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((shop) => (
                                        <tr key={shop.id}>
                                            <td style={{ fontWeight: 600 }}>{shop.shop_no}</td>
                                            {selectedTab === 'All' && <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{shop.complexes?.name || '—'}</td>}
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
                                            <td>
                                                <span className={`badge ${shop.is_active ? 'badge-paid' : 'badge-unpaid'}`}>
                                                    {shop.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                                <label className="form-label">Complex</label>
                                <select
                                    className="form-select"
                                    value={form.complex_id}
                                    onChange={(e) => setForm({ ...form, complex_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Select Complex --</option>
                                    {complexes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
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

            {/* Manage Complexes Modal */}
            {showComplexModal && (
                <div className="modal-overlay" onClick={() => setShowComplexModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🏢 Manage Complexes</h2>
                            <button className="modal-close" onClick={() => setShowComplexModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSaveComplex} style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">{editingComplex ? 'Rename Complex' : 'Add New Complex'}</label>
                                    <input
                                        className="form-input"
                                        value={complexForm.name}
                                        onChange={e => setComplexForm({ name: e.target.value })}
                                        placeholder="e.g. Silver Plaza"
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
                                    {editingComplex ? 'Update' : 'Add'}
                                </button>
                                {editingComplex && (
                                    <button type="button" className="btn btn-secondary" style={{ height: '42px' }} onClick={() => { setEditingComplex(null); setComplexForm({ name: '' }); }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="table-container" style={{ border: 'none' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Shops</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {complexes.map(c => {
                                        const count = shops.filter(s => s.complex_id === c.id).length;
                                        return (
                                            <tr key={c.id}>
                                                <td style={{ fontWeight: 600 }}>{c.name}</td>
                                                <td>{count} shops</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingComplex(c); setComplexForm({ name: c.name }); }}>✏️</button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => deleteComplex(c.id)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
