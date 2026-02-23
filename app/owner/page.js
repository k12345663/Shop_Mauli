'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function OwnerAnalytics() {
    const [stats, setStats] = useState({
        totalShops: 0,
        totalRenters: 0,
        totalExpected: 0,
        totalReceived: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
    });
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState('');
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
    const [showPicker, setShowPicker] = useState(false);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    useEffect(() => {
        const now = new Date();
        const month = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        setCurrentMonth(month.replace(' ', '-'));
    }, []);

    useEffect(() => {
        if (currentMonth) fetchStats();
    }, [currentMonth]);

    async function fetchStats() {
        setLoading(true);

        const [shopRes, renterRes, paymentRes] = await Promise.all([
            supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('renters').select('id', { count: 'exact', head: true }),
            supabase.from('rent_payments')
                .select('*, renters(renter_code, name)')
                .eq('period_month', currentMonth)
                .order('collection_date', { ascending: false }),
        ]);

        const fetchedPayments = paymentRes.data || [];
        const totalExpected = fetchedPayments.reduce((s, p) => s + Number(p.expected_amount), 0);
        const totalReceived = fetchedPayments.reduce((s, p) => s + Number(p.received_amount), 0);

        setPayments(fetchedPayments);
        setStats({
            totalShops: shopRes.count || 0,
            totalRenters: renterRes.count || 0,
            totalExpected,
            totalReceived,
            paidCount: fetchedPayments.filter(p => p.status === 'paid').length,
            partialCount: fetchedPayments.filter(p => p.status === 'partial').length,
            unpaidCount: fetchedPayments.filter(p => p.status === 'unpaid').length,
        });

        setLoading(false);
    }

    const pending = stats.totalExpected - stats.totalReceived;
    const collectionRate = stats.totalExpected > 0
        ? Math.round((stats.totalReceived / stats.totalExpected) * 100)
        : 0;

    const noData = stats.totalExpected === 0 && stats.totalShops > 0;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>📈 Analytics Dashboard</h1>
                <p>Read-only overview for {currentMonth || '...'}</p>
            </div>

            <div style={{ marginBottom: '24px', maxWidth: '300px', position: 'relative' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Select Month</label>
                <div
                    className="form-input"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)'
                    }}
                    onClick={() => setShowPicker(!showPicker)}
                >
                    <span style={{ fontWeight: 600 }}>{currentMonth || 'Select month...'}</span>
                    <span style={{ fontSize: '0.8rem' }}>📅 ▼</span>
                </div>

                {showPicker && (
                    <div className="card animate-in" style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px',
                        padding: '16px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setPickerYear(y => y - 1); }}>◀</button>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{pickerYear}</div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setPickerYear(y => y + 1); }}>▶</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {MONTHS.map(m => {
                                const mText = `${m}-${pickerYear}`;
                                const isSelected = currentMonth === mText;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setCurrentMonth(mText); setShowPicker(false); }}
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
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : noData ? (
                <div className="empty-state card" style={{ padding: '48px' }}>
                    <div className="empty-icon" style={{ fontSize: '3rem' }}>📅</div>
                    <h3 style={{ marginTop: '16px', fontWeight: 700 }}>No records yet for {currentMonth}</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '8px auto' }}>
                        The platform is starting new! Expected payments will appear here once the month starts or payments are generated.
                    </p>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-icon">🏪</span>
                            <span className="stat-label">Total Shops</span>
                            <span className="stat-value">{stats.totalShops}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">👤</span>
                            <span className="stat-label">Total Renters</span>
                            <span className="stat-value">{stats.totalRenters}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">💰</span>
                            <span className="stat-label">Expected Rent</span>
                            <span className="stat-value">₹{stats.totalExpected.toLocaleString()}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">✅</span>
                            <span className="stat-label">Received</span>
                            <span className="stat-value">₹{stats.totalReceived.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card paid">
                            <span className="stat-icon">✅</span>
                            <span className="stat-label">Paid</span>
                            <span className="stat-value">{stats.paidCount}</span>
                        </div>
                        <div className="stat-card partial">
                            <span className="stat-icon">⚠️</span>
                            <span className="stat-label">Partial</span>
                            <span className="stat-value">{stats.partialCount}</span>
                        </div>
                        <div className="stat-card unpaid">
                            <span className="stat-icon">❌</span>
                            <span className="stat-label">Unpaid</span>
                            <span className="stat-value">{stats.unpaidCount}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon">⏳</span>
                            <span className="stat-label">Pending Amount</span>
                            <span className="stat-value">₹{pending.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Collection Progress */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Collection Progress</h3>
                        <div className="progress-bar" style={{ height: '12px' }}>
                            <div className="progress-fill" style={{ width: `${collectionRate}%` }}></div>
                        </div>
                        <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                            <strong>{collectionRate}%</strong> collected — ₹{stats.totalReceived.toLocaleString()} of ₹{stats.totalExpected.toLocaleString()}
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                        {/* Summary breakdown */}
                        <div className="card">
                            <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Payment Breakdown</h3>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Count</th>
                                            <th>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: '✅ Paid', count: stats.paidCount, color: 'var(--status-paid)' },
                                            { label: '⚠️ Partial', count: stats.partialCount, color: 'var(--status-partial)' },
                                            { label: '❌ Unpaid', count: stats.unpaidCount, color: 'var(--status-unpaid)' },
                                        ].map(row => {
                                            const total = stats.paidCount + stats.partialCount + stats.unpaidCount;
                                            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                                            return (
                                                <tr key={row.label}>
                                                    <td style={{ fontWeight: 600, color: row.color }}>{row.label}</td>
                                                    <td>{row.count}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ flex: 1, maxWidth: '120px', height: '6px', background: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: row.color, borderRadius: '999px' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{pct}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Payments for this month */}
                        <div className="card">
                            <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Payment Records</h3>
                            <div className="table-container" style={{ border: 'none', maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Renter</th>
                                            <th>Received</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(p => (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{p.renters?.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.renters?.renter_code}</div>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>₹{Number(p.received_amount).toLocaleString()}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{p.collection_date ? new Date(p.collection_date).toLocaleDateString('en-IN') : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
