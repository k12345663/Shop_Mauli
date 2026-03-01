'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Toast from '@/components/Toast';

function CollectContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const renterId = searchParams.get('renterId');

    const [renter, setRenter] = useState(null);
    const [shops, setShops] = useState([]);
    const [renterShops, setRenterShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [existingPayments, setExistingPayments] = useState([]);

    const [receivedAmount, setReceivedAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('cash');

    const [selectedMonths, setSelectedMonths] = useState([]);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [showPicker, setShowPicker] = useState(false);

    // Deposit collection
    const [collectionMode, setCollectionMode] = useState('rent');
    const [depositAmounts, setDepositAmounts] = useState({});
    const [depositRemarks, setDepositRemarks] = useState({});

    useEffect(() => {
        if (renterId) fetchRenterDetails();

        let initialMonth = '';
        const monthQuery = searchParams.get('month'); // YYYY-MM

        if (monthQuery && monthQuery.includes('-')) {
            const [year, monthStr] = monthQuery.split('-');
            const monthIndex = parseInt(monthStr, 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                const shortMonth = new Date(year, monthIndex).toLocaleString('en-US', { month: 'short' });
                initialMonth = `${shortMonth}-${year}`;
                setPickerYear(parseInt(year, 10));
            }
        }

        if (!initialMonth) {
            const now = new Date();
            initialMonth = now.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        }

        setSelectedMonths([initialMonth]);
    }, [renterId, searchParams]);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    async function fetchRenterDetails() {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/renters?id=${renterId}`);
            const data = await res.json();
            if (res.ok && data) {
                setRenter(data);
                setRenterShops(data.renterShops || []);
                setShops(data.renterShops?.map(rs => rs.shops) || []);
            }
            const payRes = await fetch(`/api/db/rentPayments?renterId=${renterId}`);
            const payData = await payRes.json();
            if (payRes.ok) setExistingPayments(payData || []);
        } catch (err) {
            console.error('Fetch renter details error:', err);
        } finally {
            setLoading(false);
        }
    }

    const expectedAmountPerMonth = shops.reduce((s, sh) => s + Number(sh?.rentAmount || 0), 0);
    const totalExpectedAmount = expectedAmountPerMonth * (selectedMonths.length || 1);

    function getMonthStatus(monthYear) {
        const payment = existingPayments.find(p => p.periodMonth === monthYear);
        return payment ? payment.status : null;
    }

    function getStatus(recvAmount) {
        if (recvAmount >= expectedAmountPerMonth && expectedAmountPerMonth > 0) return 'paid';
        if (recvAmount > 0) return 'partial';
        return 'unpaid';
    }

    function toggleMonth(monthText, year) {
        const monthYear = `${monthText}-${year}`;
        if (getMonthStatus(monthYear) === 'paid') {
            setToast({ message: `${monthYear} is already fully paid!`, type: 'error' });
            return;
        }
        setSelectedMonths(prev =>
            prev.includes(monthYear) ? prev.filter(m => m !== monthYear) : [...prev, monthYear]
        );
    }

    const totalCollectedDeposit = renterShops.reduce((s, rs) => s + Number(rs.depositAmount || 0), 0);
    const totalExpectedDeposit = renterShops.reduce((s, rs) => s + Number(rs.expectedDeposit || 0), 0);
    const totalDepositCollecting = Object.values(depositAmounts).reduce((s, a) => s + (parseFloat(a) || 0), 0);

    async function handleSubmit(e) {
        e.preventDefault();
        if (collectionMode === 'deposit') { await handleDepositSubmit(); return; }

        if (selectedMonths.length === 0) {
            setToast({ message: 'Please select at least one month', type: 'error' }); return;
        }
        if (!session?.user?.id) {
            setToast({ message: 'Session expired. Please log in again.', type: 'error' }); return;
        }
        setSaving(true);
        const recvTotal = parseFloat(receivedAmount) || 0;
        const amountPerMonth = recvTotal / selectedMonths.length;

        try {
            const status = getStatus(amountPerMonth);
            const payloads = selectedMonths.map(month => ({
                renterId: parseInt(renterId),
                collectorUserId: session.user.id,
                periodMonth: month,
                expectedAmount: expectedAmountPerMonth.toString(),
                receivedAmount: amountPerMonth.toString(),
                status,
                paymentMode,
                notes: selectedMonths.length > 1 ? `${notes} (Part of multi-month payment)`.trim() : notes,
                collectionDate,
            }));

            const res = await fetch('/api/db/rentPayments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloads),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save payments');
            }

            try {
                await Promise.all(selectedMonths.map(month =>
                    fetch('/api/telegram', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            renterCode: renter.renterCode, renterName: renter.name,
                            shops: shops.map(s => s.shopNo).join(', '),
                            complex: shops[0]?.complexes?.name || 'Main',
                            month, status, received: amountPerMonth, expected: expectedAmountPerMonth,
                            notes: `${paymentMode.toUpperCase()} | Collected on ${collectionDate} by ${session?.user?.name || 'Collector'}`
                        }),
                    })
                ));
            } catch (e) { console.warn('Telegram notification failed:', e); }

            setToast({ message: `Recorded ${paymentMode} payment for ${selectedMonths.length} month(s)!`, type: 'success' });
            setTimeout(() => router.push('/collector'), 1500);
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally { setSaving(false); }
    }

    async function handleDepositSubmit() {
        if (!session?.user?.id) { setToast({ message: 'Session expired.', type: 'error' }); return; }
        if (totalDepositCollecting <= 0) { setToast({ message: 'Enter at least one deposit amount', type: 'error' }); return; }
        setSaving(true);

        try {
            for (const rs of renterShops) {
                const collected = parseFloat(depositAmounts[rs.id]) || 0;
                if (collected > 0) {
                    const newDeposit = Number(rs.depositAmount || 0) + collected;
                    await fetch('/api/db/renterShops', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: rs.id,
                            depositAmount: newDeposit.toString(),
                            depositDate: collectionDate,
                            depositRemarks: depositRemarks[rs.id] || '',
                        }),
                    });
                }
            }

            const res = await fetch('/api/db/rentPayments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    renterId: parseInt(renterId),
                    collectorUserId: session.user.id,
                    periodMonth: `Deposit-${collectionDate}`,
                    expectedAmount: totalExpectedDeposit.toString(),
                    receivedAmount: totalDepositCollecting.toString(),
                    status: 'paid',
                    paymentMode,
                    notes: `Deposit collection: ${notes}`.trim(),
                    collectionDate,
                }),
            });
            if (!res.ok) throw new Error('Failed to save deposit record');

            setToast({ message: `Deposit of ₹${totalDepositCollecting.toLocaleString()} recorded!`, type: 'success' });
            setTimeout(() => router.push('/collector'), 1500);
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        } finally { setSaving(false); }
    }

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
    if (!renter) return <div className="empty-state"><div className="empty-icon">❌</div><p>Renter not found</p></div>;

    const previewStatus = getStatus((parseFloat(receivedAmount) || 0) / (selectedMonths.length || 1));
    const statusColors = { paid: 'var(--status-paid)', partial: 'var(--status-partial)', unpaid: 'var(--status-unpaid)' };

    const PaymentModeSelector = () => (
        <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <div style={{ display: 'flex', gap: '8px' }}>
                {['cash', 'cheque', 'online'].map(mode => (
                    <button key={mode} type="button"
                        onClick={() => setPaymentMode(mode)}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
                            border: paymentMode === mode ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            background: paymentMode === mode ? 'rgba(99,102,241,0.1)' : 'transparent',
                            color: paymentMode === mode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: paymentMode === mode ? 700 : 400,
                            cursor: 'pointer', fontSize: '0.9rem', textTransform: 'capitalize',
                        }}
                    >
                        {mode === 'cash' ? '💵' : mode === 'cheque' ? '📝' : '📱'} {mode}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Mark Payment</h1>
                <p>Record rent or deposit collection</p>
            </div>

            {/* Renter Summary */}
            <div className="payment-summary">
                <div className="renter-name">{renter.name}</div>
                <div className="renter-code">{renter.renterCode}</div>
                {renter.phone && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>📞 {renter.phone}</div>}
                <div className="shops-list">
                    {renterShops.map((rs, i) => (
                        <span key={i} className="shop-tag">
                            {rs.shops?.complexes?.name || '—'} — Shop {rs.shops?.shopNo} — ₹{Number(rs.shops?.rentAmount || 0).toLocaleString()}/mo
                            {Number(rs.depositAmount || 0) > 0 && (
                                <span style={{ opacity: 0.7, fontSize: '0.8em' }}> (Dep: ₹{Number(rs.depositAmount).toLocaleString()})</span>
                            )}
                        </span>
                    ))}
                </div>
                <div className="expected-total">
                    <span className="label">Expected Rent (per month)</span>
                    <span className="amount">₹{expectedAmountPerMonth.toLocaleString()}</span>
                </div>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button type="button" className={`btn ${collectionMode === 'rent' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCollectionMode('rent')} style={{ flex: 1, justifyContent: 'center' }}>
                    💰 Rent Collection
                </button>
                <button type="button" className={`btn ${collectionMode === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCollectionMode('deposit')} style={{ flex: 1, justifyContent: 'center' }}>
                    🏦 Deposit Collection
                </button>
            </div>

            {/* RENT COLLECTION MODE */}
            {collectionMode === 'rent' && (
                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label className="form-label">Select Month(s)</label>
                            <div className="form-input" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '42px', padding: '6px 12px', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowPicker(!showPicker)}>
                                {selectedMonths.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Select months...</span>}
                                {selectedMonths.map(m => (
                                    <span key={m} className="shop-tag" style={{ margin: 0, padding: '2px 8px', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {m}
                                        <span onClick={(e) => { e.stopPropagation(); setSelectedMonths(prev => prev.filter(x => x !== m)); }} style={{ cursor: 'pointer', fontSize: '14px' }}>✕</span>
                                    </span>
                                ))}
                            </div>

                            {showPicker && (
                                <div className="card animate-in" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px', padding: '16px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setPickerYear(y => y - 1); }}>◀</button>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{pickerYear}</div>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setPickerYear(y => y + 1); }}>▶</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {MONTHS.map(m => {
                                            const monthYear = `${m}-${pickerYear}`;
                                            const isSelected = selectedMonths.includes(monthYear);
                                            const paidStatus = getMonthStatus(monthYear);
                                            const isPaid = paidStatus === 'paid';
                                            const isPartial = paidStatus === 'partial';
                                            return (
                                                <button key={m} type="button" onClick={(e) => { e.stopPropagation(); toggleMonth(m, pickerYear); }} disabled={isPaid}
                                                    style={{
                                                        padding: '10px 4px', borderRadius: 'var(--radius-sm)', border: 'none',
                                                        background: isPaid ? 'rgba(16,185,129,0.2)' : isSelected ? 'var(--accent-primary)' : isPartial ? 'rgba(245,158,11,0.2)' : 'var(--bg-secondary)',
                                                        color: isPaid ? '#10b981' : isSelected ? 'white' : isPartial ? '#f59e0b' : 'var(--text-primary)',
                                                        fontWeight: isSelected || isPaid ? 700 : 400, cursor: isPaid ? 'not-allowed' : 'pointer', fontSize: '0.85rem', opacity: isPaid ? 0.7 : 1,
                                                    }}>
                                                    {m}
                                                    {isPaid && <div style={{ fontSize: '0.6rem' }}>✅ Paid</div>}
                                                    {isPartial && <div style={{ fontSize: '0.6rem' }}>⚠️ Partial</div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                        <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => setShowPicker(false)}>Done</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <PaymentModeSelector />

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Collection Date</label>
                                <input className="form-input" type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Amount Received (₹)</label>
                                <input className="form-input" type="number" step="0.01" min="0" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="Enter total amount" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks..." />
                        </div>

                        {selectedMonths.length > 0 && (
                            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: `2px solid ${statusColors[previewStatus]}`, background: `${statusColors[previewStatus]}15`, marginBottom: '16px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status Preview ({selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''})</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: statusColors[previewStatus] }}>
                                    {previewStatus === 'paid' ? '✅ PAID' : previewStatus === 'partial' ? '⚠️ PARTIAL' : '❌ UNPAID'}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Total Expected: ₹{totalExpectedAmount.toLocaleString()}</div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '14px' }} disabled={saving}>
                            {saving ? 'Saving...' : `💾 Save ${paymentMode.toUpperCase()} Payment for ${selectedMonths.length} Month(s)`}
                        </button>
                    </form>
                </div>
            )}

            {/* DEPOSIT COLLECTION MODE */}
            {collectionMode === 'deposit' && (
                <div className="card">
                    <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>🏦 Deposit Collection</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            {renterShops.map(rs => {
                                const existingDep = Number(rs.depositAmount || 0);
                                const expectedDep = Number(rs.expectedDeposit || 0);
                                const remainingDep = Math.max(0, expectedDep - existingDep);
                                return (
                                    <div key={rs.id} style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{rs.shops?.complexes?.name || '—'} — Shop {rs.shops?.shopNo}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rent: ₹{Number(rs.shops?.rentAmount || 0).toLocaleString()}/mo</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Deposit: ₹{expectedDep.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--status-paid)', fontWeight: 600 }}>Collected: ₹{existingDep.toLocaleString()}</div>
                                                {remainingDep > 0 && (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--status-partial)', fontWeight: 600 }}>Remaining: ₹{remainingDep.toLocaleString()}</div>
                                                )}
                                                {rs.depositDate && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dated: {rs.depositDate}</div>}
                                            </div>
                                        </div>
                                        <div className="form-row" style={{ gap: '8px' }}>
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Amount (₹)</label>
                                                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00"
                                                    value={depositAmounts[rs.id] || ''}
                                                    onChange={(e) => setDepositAmounts(prev => ({ ...prev, [rs.id]: e.target.value }))} />
                                            </div>
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.8rem' }}>Remark</label>
                                                <input className="form-input" placeholder="e.g. Cheque #123"
                                                    value={depositRemarks[rs.id] || ''}
                                                    onChange={(e) => setDepositRemarks(prev => ({ ...prev, [rs.id]: e.target.value }))} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <PaymentModeSelector />

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Deposit Date</label>
                                <input className="form-input" type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes (optional)</label>
                                <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Deposit remarks..." />
                            </div>
                        </div>

                        <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '2px solid var(--accent-primary)', background: 'rgba(99,102,241,0.08)', marginBottom: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Deposit Summary</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{totalDepositCollecting.toLocaleString()}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Existing: ₹{totalCollectedDeposit.toLocaleString()} → New total: ₹{(totalCollectedDeposit + totalDepositCollecting).toLocaleString()}
                                {totalExpectedDeposit > 0 && ` (Out of ₹${totalExpectedDeposit.toLocaleString()})`}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '14px' }} disabled={saving || totalDepositCollecting <= 0}>
                            {saving ? 'Saving...' : `🏦 Record ${paymentMode.toUpperCase()} Deposit of ₹${totalDepositCollecting.toLocaleString()}`}
                        </button>
                    </form>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}

export default function CollectPage() {
    return (
        <Suspense fallback={<div className="loading-page"><div className="spinner"></div></div>}>
            <CollectContent />
        </Suspense>
    );
}
