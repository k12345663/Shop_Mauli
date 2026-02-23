'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Toast from '@/components/Toast';

function CollectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const renterId = searchParams.get('renter_id');

    const [renter, setRenter] = useState(null);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const [receivedAmount, setReceivedAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);

    const [selectedMonths, setSelectedMonths] = useState([]);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (renterId) fetchRenterDetails();

        // Default to current month
        const now = new Date();
        const currentMonth = now.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '-');
        setSelectedMonths([currentMonth]);
    }, [renterId]);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    async function fetchRenterDetails() {
        setLoading(true);
        const { data } = await supabase
            .from('renters')
            .select('*, renter_shops(shop_id, shops(shop_no, complex, rent_amount, rent_collection_day))')
            .eq('id', renterId)
            .single();

        if (data) {
            setRenter(data);
            setShops(data.renter_shops?.map(rs => rs.shops) || []);
        }
        setLoading(false);
    }

    const expectedAmountPerMonth = shops.reduce((s, sh) => s + Number(sh?.rent_amount || 0), 0);
    const totalExpectedAmount = expectedAmountPerMonth * (selectedMonths.length || 1);

    function getStatus(recvAmount) {
        if (recvAmount >= expectedAmountPerMonth && expectedAmountPerMonth > 0) return 'paid';
        if (recvAmount > 0) return 'partial';
        return 'unpaid';
    }

    function toggleMonth(monthText, year) {
        const monthYear = `${monthText}-${year}`;
        setSelectedMonths(prev =>
            prev.includes(monthYear) ? prev.filter(m => m !== monthYear) : [...prev, monthYear]
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (selectedMonths.length === 0) {
            setToast({ message: 'Please select at least one month', type: 'error' });
            return;
        }
        setSaving(true);

        const recvTotal = parseFloat(receivedAmount) || 0;
        const amountPerMonth = recvTotal / selectedMonths.length;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        const results = await Promise.all(selectedMonths.map(async (month) => {
            const status = getStatus(amountPerMonth);
            const payload = {
                renter_id: parseInt(renterId),
                collector_user_id: user.id,
                period_month: month,
                expected_amount: expectedAmountPerMonth,
                received_amount: amountPerMonth,
                status,
                notes: selectedMonths.length > 1 ? `${notes} (Part of multi-month payment)`.trim() : notes,
                collection_date: collectionDate,
            };
            return supabase.from('rent_payments').insert(payload);
        }));

        const errors = results.filter(r => r.error);

        if (errors.length > 0) {
            const msg = errors[0].error.code === '23505'
                ? 'Payment for one of the selected months already exists.'
                : errors[0].error.message;
            setToast({ message: msg, type: 'error' });
            setSaving(false);
            return;
        }

        // Send Telegram notifications
        try {
            await Promise.all(selectedMonths.map(month =>
                fetch('/api/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        renterCode: renter.renter_code,
                        renterName: renter.name,
                        shops: shops.map(s => s.shop_no).join(', '),
                        month: month,
                        status: getStatus(amountPerMonth),
                        received: amountPerMonth,
                        expected: expectedAmountPerMonth,
                        notes: `Collected on ${collectionDate}`
                    }),
                })
            ));
        } catch (e) {
            console.warn('Telegram notification failed:', e);
        }

        setToast({ message: `Recorded payment for ${selectedMonths.length} month(s)!`, type: 'success' });
        setTimeout(() => router.push('/collector'), 1500);
        setSaving(false);
    }

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    if (!renter) {
        return (
            <div className="empty-state">
                <div className="empty-icon">❌</div>
                <p>Renter not found</p>
            </div>
        );
    }

    const previewStatus = getStatus((parseFloat(receivedAmount) || 0) / (selectedMonths.length || 1));
    const statusColors = {
        paid: 'var(--status-paid)',
        partial: 'var(--status-partial)',
        unpaid: 'var(--status-unpaid)',
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Mark Payment</h1>
                <p>Record rent collection for this renter</p>
            </div>

            {/* Renter Summary */}
            <div className="payment-summary">
                <div className="renter-name">{renter.name}</div>
                <div className="renter-code">{renter.renter_code}</div>
                {renter.phone && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>📞 {renter.phone}</div>}

                <div className="shops-list">
                    {shops.map((sh, i) => (
                        <span key={i} className="shop-tag">
                            {sh.complex} - {sh.shop_no} — ₹{Number(sh.rent_amount).toLocaleString()} (Due Day: {sh.rent_collection_day || 1})
                        </span>
                    ))}
                </div>

                <div className="expected-total">
                    <span className="label">Expected Rent (per month)</span>
                    <span className="amount">₹{expectedAmountPerMonth.toLocaleString()}</span>
                </div>
            </div>

            {/* Payment Form */}
            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Select Month(s)</label>

                        <div
                            className="form-input"
                            style={{
                                display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '42px', padding: '6px 12px',
                                cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)'
                            }}
                            onClick={() => setShowPicker(!showPicker)}
                        >
                            {selectedMonths.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Select months...</span>}
                            {selectedMonths.map(m => (
                                <span key={m} className="shop-tag" style={{ margin: 0, padding: '2px 8px', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {m}
                                    <span onClick={(e) => { e.stopPropagation(); setSelectedMonths(prev => prev.filter(x => x !== m)); }} style={{ cursor: 'pointer', fontSize: '14px' }}>✕</span>
                                </span>
                            ))}
                        </div>

                        {showPicker && (
                            <div className="card animate-in" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px',
                                padding: '16px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setPickerYear(y => y - 1); }}>◀</button>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{pickerYear}</div>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setPickerYear(y => y + 1); }}>▶</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {MONTHS.map(m => {
                                        const isSelected = selectedMonths.includes(`${m}-${pickerYear}`);
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleMonth(m, pickerYear); }}
                                                style={{
                                                    padding: '10px 4px', borderRadius: 'var(--radius-sm)', border: 'none',
                                                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                                    color: isSelected ? 'white' : 'var(--text-primary)',
                                                    fontWeight: isSelected ? 700 : 400,
                                                    cursor: 'pointer', fontSize: '0.85rem'
                                                }}
                                            >
                                                {m}
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

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Collection Date</label>
                            <input
                                className="form-input"
                                type="date"
                                value={collectionDate}
                                onChange={(e) => setCollectionDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Amount Received (₹)</label>
                            <input
                                className="form-input"
                                type="number"
                                step="0.01"
                                min="0"
                                value={receivedAmount}
                                onChange={(e) => setReceivedAmount(e.target.value)}
                                placeholder="Enter total amount"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (optional)</label>
                        <input
                            className="form-input"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any remarks..."
                        />
                    </div>

                    {/* Live status preview */}
                    {selectedMonths.length > 0 && (
                        <div style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${statusColors[previewStatus]}`,
                            background: `${statusColors[previewStatus]}15`,
                            marginBottom: '16px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Status Preview ({selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''})
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: statusColors[previewStatus] }}>
                                {previewStatus === 'paid' ? '✅ PAID' : previewStatus === 'partial' ? '⚠️ PARTIAL' : '❌ UNPAID'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Total Expected: ₹{totalExpectedAmount.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                (₹{(parseFloat(receivedAmount) || 0).toLocaleString()} divided into {selectedMonths.length} records)
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '14px' }}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : `💾 Save Payment for ${selectedMonths.length} Month(s)`}
                    </button>
                </form>
            </div>

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
