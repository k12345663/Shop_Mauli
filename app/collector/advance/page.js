'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';

export default function AdvancePay() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [renters, setRenters] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedRenter, setSelectedRenter] = useState(null);
    const [lumpSum, setLumpSum] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchRenters();
    }, []);

    async function fetchRenters() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/renters');
            const data = await res.json();
            if (res.ok) {
                // Only keep renters that have active shops
                const validRenters = (data || []).map(r => ({
                    ...r,
                    activeShops: (r.renterShops || []).map(rs => rs.shops).filter(s => s?.isActive)
                })).filter(r => r.activeShops.length > 0);

                setRenters(validRenters);
                setResults(validRenters);
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

    const handleSelect = (renter) => {
        setSelectedRenter(renter);
        setLumpSum('');
        setNotes('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const monthlyExpected = selectedRenter?.activeShops?.reduce(
        (sum, sh) => sum + Number(sh.rentAmount || 0), 0
    ) || 0;

    const lumpSumNum = Number(lumpSum) || 0;
    const fullMonths = monthlyExpected > 0 ? Math.floor(lumpSumNum / monthlyExpected) : 0;
    const remainder = monthlyExpected > 0 ? lumpSumNum % monthlyExpected : 0;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedRenter) {
            setToast({ message: 'Select a renter first', type: 'error' });
            return;
        }
        if (lumpSumNum <= 0) {
            setToast({ message: 'Enter a valid amount', type: 'error' });
            return;
        }

        if (!confirm(`Are you sure you want to apply ₹${lumpSumNum.toLocaleString()} across future months for ${selectedRenter.name}?`)) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/collector/advance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    renterId: selectedRenter.id,
                    lumpSum: lumpSumNum,
                    paymentMode,
                    notes: notes.trim(),
                    collectionDate: new Date().toISOString().split('T')[0]
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process advance payment');

            setToast({ message: `Success! Distributed across ${data.monthsAffected} months.`, type: 'success' });
            setLumpSum('');
            setNotes('');
            setSelectedRenter(null);

            // Wait a sec then go to history
            setTimeout(() => {
                router.push('/collector/history');
            }, 2000);

        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '2.5rem' }}>⚡</div>
                    <div>
                        <h1 style={{ background: 'linear-gradient(45deg, #FFB75E, #ED8F03)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>Advance Rent Payment</h1>
                        <p style={{ margin: '4px 0 0 0' }}>Distribute a bulk payment automatically across future months</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1fr)', gap: '24px' }}>

                {/* Left Side: Search & Renter List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card">
                        <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>👤 Select Renter</h3>
                        <div className="search-container" style={{ marginBottom: '16px' }}>
                            <span className="search-icon">🔍</span>
                            <input
                                className="search-input"
                                placeholder="Search by name or code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                            {results.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No active renters found</div>
                            ) : (
                                results.map(renter => {
                                    const totalRent = renter.activeShops.reduce((sum, sh) => sum + Number(sh?.rentAmount || 0), 0);
                                    const isSelected = selectedRenter?.id === renter.id;

                                    return (
                                        <div
                                            key={renter.id}
                                            onClick={() => handleSelect(renter)}
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                background: isSelected ? 'var(--accent-glow)' : 'transparent',
                                                borderLeft: isSelected ? '4px solid #ED8F03' : '4px solid transparent',
                                                borderTop: '1px solid var(--border-color)',
                                                borderRight: '1px solid var(--border-color)',
                                                borderBottom: '1px solid var(--border-color)',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{renter.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: isSelected ? '#ED8F03' : 'var(--accent-primary-hover)' }}>{renter.renterCode}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₹{totalRent.toLocaleString()}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/mo</span></div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{renter.activeShops.length} shops</div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Payment Form & Preview */}
                <div>
                    {!selectedRenter ? (
                        <div className="card empty-state" style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>👈</div>
                            <h3 style={{ color: 'var(--text-secondary)' }}>Select a Renter</h3>
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>Choose from the list to initiate an advance auto-split payment.</p>
                        </div>
                    ) : (
                        <div className="card" style={{ position: 'sticky', top: '24px', borderTop: '4px solid #ED8F03' }}>
                            <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Selected Target</div>
                                <h2 style={{ margin: '0 0 4px 0' }}>{selectedRenter.name}</h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>{selectedRenter.renterCode}</span>
                                    {selectedRenter.phone && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>📞 {selectedRenter.phone}</span>}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Combined Monthly Rent</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>₹{monthlyExpected.toLocaleString()}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>For {selectedRenter.activeShops.length} Active Shops</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label" style={{ fontWeight: 700, color: '#ED8F03' }}>Lump Sum Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ fontSize: '1.25rem', padding: '12px', fontWeight: 700, borderColor: '#ED8F03' }}
                                        placeholder="0"
                                        value={lumpSum}
                                        onChange={(e) => setLumpSum(e.target.value)}
                                        required
                                        min="1"
                                    />
                                </div>

                                {/* Dynamic Preview */}
                                {lumpSumNum > 0 && (
                                    <div style={{ background: 'rgba(237, 143, 3, 0.05)', border: '1px solid rgba(237, 143, 3, 0.2)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#ED8F03', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📊</span> Allocation Preview
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Full Months Covered:</span>
                                                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fullMonths} Months</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Remaining Balance (Partial next month):</span>
                                                <span style={{ fontWeight: 700, color: remainder > 0 ? 'var(--status-partial)' : 'var(--text-muted)' }}>₹{remainder.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="form-label">Payment Mode</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {['cash', 'cheque', 'online'].map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setPaymentMode(mode)}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: paymentMode === mode ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                    background: paymentMode === mode ? 'var(--accent-glow)' : 'transparent',
                                                    color: paymentMode === mode ? 'var(--accent-primary-hover)' : 'var(--text-secondary)',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {mode === 'cash' ? '💵 Cash' : mode === 'cheque' ? '📝 Cheque' : '📱 Online'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label">Internal Notes (Optional)</label>
                                    <textarea
                                        className="form-input"
                                        rows="2"
                                        placeholder="E.g., Cheque number, Transaction ID, Advance for 1 year..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        style={{ resize: 'vertical' }}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving || lumpSumNum <= 0}
                                    style={{ padding: '14px', fontSize: '1.1rem', background: 'linear-gradient(45deg, #FFB75E, #ED8F03)', border: 'none' }}
                                >
                                    {saving ? 'Processing...' : `⚡ Distribute ₹${lumpSumNum.toLocaleString()}`}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <style jsx>{`
                @media (max-width: 900px) {
                    div[style*="grid-template-columns: minmax"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
