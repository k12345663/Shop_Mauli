'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

export default function AssignShops() {
    const [renters, setRenters] = useState([]);
    const [shops, setShops] = useState([]);
    const [selectedRenter, setSelectedRenter] = useState(null);
    const [assignedShopIds, setAssignedShopIds] = useState([]);
    const [shopDeposits, setShopDeposits] = useState({}); // { shopId: deposit }
    const [complexes, setComplexes] = useState([]);
    const [selectedTab, setSelectedTab] = useState('All');

    useEffect(() => {
        Promise.all([fetchRenters(), fetchShops(), fetchComplexes()]).then(() => setLoading(false));
    }, []);

    async function fetchComplexes() {
        const { data } = await supabase.from('complexes').select('*').order('name');
        setComplexes(data || []);
    }

    async function fetchRenters() {
        const { data } = await supabase.from('renters').select('*').order('renter_code');
        setRenters(data || []);
    }

    async function fetchShops() {
        const { data } = await supabase
            .from('shops')
            .select('id, shop_no, complex_id, complexes(name), rent_amount')
            .eq('is_active', true)
            .order('shop_no');
        setShops(data || []);
    }

    async function selectRenter(renter) {
        setSelectedRenter(renter);
        const { data } = await supabase
            .from('renter_shops')
            .select('shop_id, deposit_amount')
            .eq('renter_id', renter.id);

        const ids = (data || []).map(d => d.shop_id);
        const deposits = {};
        (data || []).forEach(d => {
            deposits[d.shop_id] = d.deposit_amount || 0;
        });

        setAssignedShopIds(ids);
        setShopDeposits(deposits);
    }

    function toggleShop(shopId) {
        setAssignedShopIds(prev =>
            prev.includes(shopId)
                ? prev.filter(id => id !== shopId)
                : [...prev, shopId]
        );
    }

    async function saveAssignments() {
        if (!selectedRenter) return;
        setSaving(true);

        // Delete existing assignments
        await supabase.from('renter_shops').delete().eq('renter_id', selectedRenter.id);

        // Insert new assignments
        if (assignedShopIds.length > 0) {
            const rows = assignedShopIds.map(shop_id => ({
                renter_id: selectedRenter.id,
                shop_id,
                deposit_amount: parseFloat(shopDeposits[shop_id] || 0)
            }));
            const { error } = await supabase.from('renter_shops').insert(rows);
            if (error) {
                setToast({ message: error.message, type: 'error' });
                setSaving(false);
                return;
            }
        }

        setToast({ message: `Saved ${assignedShopIds.length} shop assignments`, type: 'success' });
        setSaving(false);
    }

    const filteredRenters = renters.filter(r =>
        r.renter_code.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalAssignedRent = shops
        .filter(s => assignedShopIds.includes(s.id))
        .reduce((sum, s) => sum + Number(s.rent_amount), 0);

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Assign Shops to Renters</h1>
                <p>Select a renter, then check/uncheck shops</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left: Renter List */}
                <div className="card">
                    <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>👤 Select Renter</h3>
                    <div className="search-container" style={{ marginBottom: '12px' }}>
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder="Search renters..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {filteredRenters.map(renter => (
                            <div
                                key={renter.id}
                                onClick={() => selectRenter(renter)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    background: selectedRenter?.id === renter.id ? 'var(--accent-glow)' : 'transparent',
                                    borderLeft: selectedRenter?.id === renter.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>{renter.renter_code}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{renter.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Shop Checkboxes */}
                <div className="card">
                    <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>🏪 Shops</h3>
                    {!selectedRenter ? (
                        <div className="empty-state">
                            <div className="empty-icon">👈</div>
                            <p>Select a renter from the left</p>
                        </div>
                    ) : (
                        <>
                            <div className="payment-summary" style={{ marginBottom: '16px' }}>
                                <div className="renter-name">{selectedRenter.name}</div>
                                <div className="renter-code">{selectedRenter.renter_code}</div>
                                <div className="expected-total" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                    <span className="label">{assignedShopIds.length} shops assigned</span>
                                    <span className="amount" style={{ color: 'var(--accent-primary-hover)' }}>₹{totalAssignedRent.toLocaleString()}/mo</span>
                                </div>
                            </div>

                            <div className="complex-tabs" style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {['All', ...complexes.map(c => c.name)].map(tab => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setSelectedTab(tab)}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '0.8rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            background: selectedTab === tab ? 'var(--accent-primary)' : 'transparent',
                                            color: selectedTab === tab ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="checkbox-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {shops
                                    .filter(s => selectedTab === 'All' || s.complexes?.name === selectedTab)
                                    .map(shop => (
                                        <div key={shop.id} className="checkbox-item" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={assignedShopIds.includes(shop.id)}
                                                    onChange={() => toggleShop(shop.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <div className="shop-info" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleShop(shop.id)}>
                                                    <div>
                                                        <div className="shop-no" style={{ fontWeight: 600 }}>{shop.shop_no}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{shop.complexes?.name || '—'}</div>
                                                    </div>
                                                    <div className="shop-rent" style={{ color: 'var(--text-secondary)' }}>₹{Number(shop.rent_amount).toLocaleString()}</div>
                                                </div>
                                            </div>

                                            {assignedShopIds.includes(shop.id) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '26px', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Deposit: ₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        style={{ padding: '4px 8px', height: '28px', fontSize: '0.85rem' }}
                                                        placeholder="0.00"
                                                        value={shopDeposits[shop.id] || ''}
                                                        onChange={(e) => setShopDeposits(prev => ({ ...prev, [shop.id]: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
                                onClick={saveAssignments}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : '💾 Save Assignments'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <style jsx>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
