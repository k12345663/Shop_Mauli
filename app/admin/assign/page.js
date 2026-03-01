'use client';

import { useState, useEffect } from 'react';
import Toast from '@/components/Toast';

export default function AssignShops() {
    const [renters, setRenters] = useState([]);
    const [shops, setShops] = useState([]);
    const [selectedRenter, setSelectedRenter] = useState(null);
    const [assignedShopIds, setAssignedShopIds] = useState([]);
    const [shopDeposits, setShopDeposits] = useState({}); // { shopId: deposit }
    const [complexes, setComplexes] = useState([]);
    const [selectedTab, setSelectedTab] = useState('All');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        Promise.all([fetchRenters(), fetchShops(), fetchComplexes()]).then(() => setLoading(false));
    }, []);

    async function fetchComplexes() {
        try {
            const res = await fetch('/api/db/complexes');
            const data = await res.json();
            if (res.ok) setComplexes(data || []);
        } catch (err) { console.error('Fetch complexes error:', err); }
    }

    async function fetchRenters() {
        try {
            const res = await fetch('/api/db/renters');
            const data = await res.json();
            if (res.ok) setRenters(data || []);
        } catch (err) { console.error('Fetch renters error:', err); }
    }

    async function fetchShops() {
        try {
            const res = await fetch('/api/admin/shops');
            const data = await res.json();
            if (res.ok) {
                // Filter active shops and simplified join
                const activeOnes = (data || []).filter(s => s.isActive);
                setShops(activeOnes);
            }
        } catch (err) { console.error('Fetch shops error:', err); }
    }

    async function selectRenter(renter) {
        setSelectedRenter(renter);
        try {
            const res = await fetch(`/api/db/renterShops?renterId=${renter.id}`);
            const data = await res.json();
            if (res.ok) {
                const ids = (data || []).map(d => d.shopId);
                const deposits = {};
                const collectedDepositsObj = {};
                (data || []).forEach(d => {
                    deposits[d.shopId] = d.expectedDeposit || 0;
                    collectedDepositsObj[d.shopId] = d.depositAmount || 0; // Tracks what collector has already collected
                });
                setAssignedShopIds(ids);
                setShopDeposits(deposits);
                // Also store collected deposits in state so we can calculate remaining
                setCollectedDeposits(collectedDepositsObj);
            }
        } catch (err) { console.error('Select renter error:', err); }
    }

    const [collectedDeposits, setCollectedDeposits] = useState({});

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

        try {
            // Delete existing assignments for this renter
            await fetch(`/api/db/renterShops?renterId=${selectedRenter.id}`, { method: 'DELETE' });

            // Insert new assignments
            if (assignedShopIds.length > 0) {
                const rows = assignedShopIds.map(shopId => ({
                    renterId: selectedRenter.id,
                    shopId,
                    expectedDeposit: parseFloat(shopDeposits[shopId] || 0).toString(),
                    depositAmount: parseFloat(collectedDeposits[shopId] || 0).toString() // Preserve any collected amount
                }));

                const res = await fetch('/api/db/renterShops', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rows),
                });
                if (!res.ok) throw new Error('Failed to save assignments');
            }

            setToast({ message: `Saved ${assignedShopIds.length} shop assignments`, type: 'success' });
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    const filteredRenters = renters.filter(r =>
        r.renterCode.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalAssignedRent = shops
        .filter(s => assignedShopIds.includes(s.id))
        .reduce((sum, s) => sum + Number(s.rentAmount), 0);

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
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
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
                                <div style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>{renter.renterCode}</div>
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
                                <div className="renter-code">{selectedRenter.renterCode}</div>
                                <div className="expected-total" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                    <span className="label">{assignedShopIds.length} shops assigned</span>
                                    <span className="amount" style={{ color: 'var(--accent-primary-hover)' }}>₹{totalAssignedRent.toLocaleString()}/mo</span>
                                </div>
                            </div>

                            <div className="complex-tabs" style={{ display: 'flex', gap: '4px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {['All', ...new Set(complexes.map(c => c.name))].map((tab, idx) => (
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

                            <div className="checkbox-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                                {shops
                                    .filter(s => selectedTab === 'All' || s.complexes?.name === selectedTab)
                                    .map(shop => {
                                        const isChecked = assignedShopIds.includes(shop.id);
                                        const expectedDep = Number(shopDeposits[shop.id] || 0);
                                        const collectedDep = Number(collectedDeposits[shop.id] || 0);
                                        const remainingDep = Math.max(0, expectedDep - collectedDep);

                                        return (
                                            <div key={shop.id} className="checkbox-item" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: isChecked ? '1px solid var(--accent-glow)' : '1px solid transparent' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleShop(shop.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <div className="shop-info" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleShop(shop.id)}>
                                                        <div>
                                                            <div className="shop-no" style={{ fontWeight: 600 }}>{shop.shopNo}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{shop.complexes?.name || '—'}</div>
                                                        </div>
                                                        <div className="shop-rent" style={{ color: 'var(--text-secondary)' }}>₹{Number(shop.rentAmount).toLocaleString()}</div>
                                                    </div>
                                                </div>

                                                {isChecked && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '26px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '110px' }}>Expected Deposit:</span>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                style={{ padding: '4px 8px', height: '28px', fontSize: '0.85rem', flex: 1 }}
                                                                placeholder="0.00"
                                                                value={shopDeposits[shop.id] || ''}
                                                                onChange={(e) => setShopDeposits(prev => ({ ...prev, [shop.id]: e.target.value }))}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', paddingLeft: '2px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                                                            <div style={{ color: 'var(--status-paid)' }}>Collected: ₹{collectedDep.toLocaleString()}</div>
                                                            <div style={{ color: remainingDep > 0 ? 'var(--status-unpaid)' : 'var(--text-muted)' }}>Rem: ₹{remainingDep.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
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
