'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CollectorSearch() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [renters, setRenters] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initialize to previous month
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        fetchRenters(selectedMonth);
    }, [selectedMonth]);

    async function fetchRenters(month) {
        setLoading(true);
        try {
            const res = await fetch(`/api/collector/search?month=${month}`);
            const data = await res.json();
            if (res.ok) {
                setRenters(data || []);
                setResults(data || []);
            }
        } catch (err) {
            console.error('Fetch renters error:', err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!search.trim()) {
            setResults(renters);
        } else {
            const s = search.toLowerCase();
            setResults(renters.filter(r =>
                r.renterCode.toLowerCase().includes(s) ||
                r.name.toLowerCase().includes(s)
            ));
        }
    }, [search, renters]);

    function handleSelect(renter) {
        router.push(`/collector/collect?renterId=${renter.id}&month=${selectedMonth}`);
    }

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>Rent Collection</h1>
                    <p>Select a month and a renter to log payments</p>
                </div>
                <button
                    className="btn"
                    style={{ background: 'linear-gradient(45deg, #FFB75E, #ED8F03)', color: 'white', border: 'none', padding: '10px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => router.push('/collector/advance')}
                >
                    <span>⚡</span> Advance / Bulk Pay
                </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {/* Month Selector */}
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>📅 Collection Month:</span>
                    <input
                        type="month"
                        className="form-input"
                        style={{ padding: '6px 12px', height: 'auto', width: 'auto', fontWeight: 600 }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>

                <div className="search-container" style={{ flex: 1, minWidth: '250px', marginBottom: 0 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        className="search-input"
                        placeholder="Type renter code or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : results.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📁</div>
                    <p>No renters found. Update search or try another month.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {results.map(renter => {
                        const shopList = renter.renterShops?.map(rs => rs.shops).filter(s => s?.isActive) || [];
                        const status = renter.paymentStatus?.status || 'unpaid';

                        let badgeColor = 'var(--status-unpaid)';
                        let badgeText = '❌ Unpaid';
                        if (status === 'paid') { badgeColor = 'var(--status-paid)'; badgeText = '✅ Paid'; }
                        if (status === 'partial') { badgeColor = 'var(--status-partial)'; badgeText = '⚠️ Partial'; }
                        if (status === 'No Rent Due') { badgeColor = 'var(--text-muted)'; badgeText = '➖ No Rent'; }

                        const depExpected = renter.depositStatus?.expected || 0;
                        const depCollected = renter.depositStatus?.collected || 0;
                        const depRemaining = depExpected - depCollected;

                        return (
                            <div
                                key={renter.id}
                                className="card"
                                style={{
                                    cursor: 'pointer',
                                    borderLeft: `4px solid ${badgeColor}`
                                }}
                                onClick={() => handleSelect(renter)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{renter.name}</div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                color: badgeColor,
                                                background: `${badgeColor}20`,
                                                padding: '2px 8px',
                                                borderRadius: '12px'
                                            }}>
                                                {badgeText}
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--accent-primary-hover)', fontSize: '0.9rem', fontWeight: 600 }}>
                                            {renter.renterCode}
                                        </div>
                                        {renter.phone && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                                                📞 {renter.phone}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                            {shopList.map((sh, i) => (
                                                <span key={i} className="shop-tag">
                                                    {sh?.complexes?.name || '—'} - {sh?.shopNo}
                                                </span>
                                            ))}
                                            {shopList.length === 0 && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active shops</span>
                                            )}
                                        </div>

                                        {depExpected > 0 && (
                                            <div style={{ marginTop: '12px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Total Deposit:</span>{' '}
                                                    <strong>₹{depExpected.toLocaleString()}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Collected:</span>{' '}
                                                    <strong style={{ color: 'var(--status-paid)' }}>₹{depCollected.toLocaleString()}</strong>
                                                </div>
                                                {depRemaining > 0 && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)' }}>Remaining:</span>{' '}
                                                        <strong style={{ color: 'var(--status-partial)' }}>₹{depRemaining.toLocaleString()}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected Rent</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{(renter.paymentStatus?.expected || 0).toLocaleString()}</div>
                                        {status === 'partial' && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--status-partial)', fontWeight: 600 }}>
                                                Collected: ₹{renter.paymentStatus.collected.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
