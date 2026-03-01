'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';

export default function PendingDeposits() {
    const router = useRouter();
    const [renters, setRenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/renters');
            const data = await res.json();
            if (res.ok) setRenters(data || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally { setLoading(false); }
    }

    // Calculate deposit info per renter
    const renterDeposits = renters.map(renter => {
        const shops = renter.renterShops || [];
        const totalDeposit = shops.reduce((s, rs) => s + Number(rs.depositAmount || 0), 0);
        const totalExpectedDeposit = shops.reduce((s, rs) => s + Number(rs.expectedDeposit || 0), 0); // Exact expected deposit from assignment
        const remaining = Math.max(0, totalExpectedDeposit - totalDeposit);
        const hasDeposit = totalDeposit > 0;

        return {
            ...renter,
            shops,
            totalDeposit,
            totalExpectedDeposit,
            remaining,
            hasDeposit,
            latestDepositDate: shops.reduce((latest, rs) => {
                if (rs.depositDate && (!latest || rs.depositDate > latest)) return rs.depositDate;
                return latest;
            }, null),
        };
    }).sort((a, b) => b.remaining - a.remaining);

    const totalPending = renterDeposits.reduce((s, r) => s + r.remaining, 0);
    const totalCollected = renterDeposits.reduce((s, r) => s + r.totalDeposit, 0);
    const pendingCount = renterDeposits.filter(r => r.remaining > 0).length;

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Pending Deposits</h1>
                <p>Track deposit collection status for all renters</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Collected</span>
                    <span className="stat-value" style={{ color: 'var(--status-paid)' }}>₹{totalCollected.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Pending</span>
                    <span className="stat-value" style={{ color: 'var(--status-unpaid)' }}>₹{totalPending.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Renters with Pending</span>
                    <span className="stat-value">{pendingCount}</span>
                </div>
            </div>

            {renterDeposits.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🏦</div><p>No renters found</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {renterDeposits.map(renter => (
                        <div key={renter.id} className="card" style={{
                            borderLeft: renter.remaining > 0 ? '4px solid var(--status-unpaid)' : '4px solid var(--status-paid)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{renter.name}</div>
                                            <div style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{renter.renterCode}</div>
                                        </div>
                                    </div>

                                    {/* Shop-wise breakdown */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                        {renter.shops.map((rs, i) => {
                                            const dep = Number(rs.depositAmount || 0);
                                            const exp = Number(rs.expectedDeposit || 0);
                                            const rem = Math.max(0, exp - dep);
                                            // Skip if no expected deposit and nothing deposited
                                            if (exp === 0 && dep === 0) return null;

                                            return (
                                                <div key={i} style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 10px',
                                                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
                                                }}>
                                                    <div style={{ fontWeight: 600, minWidth: '120px' }}>
                                                        {rs.shops?.complexes?.name || '—'} — {rs.shops?.shopNo}
                                                    </div>
                                                    <div style={{ color: 'var(--status-paid)' }}>Col: ₹{dep.toLocaleString()}</div>
                                                    <div style={{ color: 'var(--text-muted)' }}>Exp: ₹{exp.toLocaleString()}</div>
                                                    {rem > 0 && <div style={{ color: 'var(--status-unpaid)', fontWeight: 700 }}>Rem: ₹{rem.toLocaleString()}</div>}
                                                    {rs.depositDate && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({rs.depositDate})</div>}
                                                    {rs.depositRemarks && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>{rs.depositRemarks}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Collected / Expected</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                        <span style={{ color: 'var(--status-paid)' }}>₹{renter.totalDeposit.toLocaleString()}</span>
                                        <span style={{ color: 'var(--text-muted)' }}> / ₹{renter.totalExpectedDeposit.toLocaleString()}</span>
                                    </div>
                                    {renter.remaining > 0 && (
                                        <div style={{ color: 'var(--status-unpaid)', fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>
                                            Pending: ₹{renter.remaining.toLocaleString()}
                                        </div>
                                    )}
                                    <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}
                                        onClick={() => router.push(`/collector/collect?renterId=${renter.id}`)}>
                                        🏦 Collect Deposit
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
