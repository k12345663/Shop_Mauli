'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/StatusBadge';

export default function CollectorReports() {
    const { data: session } = useSession();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMonth, setFilterMonth] = useState('');

    useEffect(() => { fetchHistory(); }, []);

    async function fetchHistory() {
        setLoading(true);
        try {
            const res = await fetch('/api/collector/history');
            const data = await res.json();
            if (res.ok) setPayments(data || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally { setLoading(false); }
    }

    // Get unique months
    const months = [...new Set(payments.map(p => p.periodMonth))].sort().reverse();

    // Filter payments
    const filtered = filterMonth ? payments.filter(p => p.periodMonth === filterMonth) : payments;

    // Stats
    const totalCollected = filtered.reduce((s, p) => s + Number(p.receivedAmount || 0), 0);
    const totalExpected = filtered.reduce((s, p) => s + Number(p.expectedAmount || 0), 0);
    const paidCount = filtered.filter(p => p.status === 'paid').length;
    const partialCount = filtered.filter(p => p.status === 'partial').length;
    const unpaidCount = filtered.filter(p => p.status === 'unpaid').length;

    // Mode breakdown
    const modeStats = filtered.reduce((acc, p) => {
        const mode = p.paymentMode || 'cash';
        if (!acc[mode]) acc[mode] = { count: 0, total: 0 };
        acc[mode].count++;
        acc[mode].total += Number(p.receivedAmount || 0);
        return acc;
    }, {});

    const modeIcons = { cash: '💵', cheque: '📝', online: '📱' };
    const modeColors = { cash: '#10b981', cheque: '#f59e0b', online: '#818cf8' };

    if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Collection Reports</h1>
                <p>Your personal collection summary and analytics</p>
            </div>

            {/* Month Filter */}
            <div style={{ marginBottom: '16px' }}>
                <select className="form-select" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                    style={{ maxWidth: '250px', padding: '8px 12px' }}>
                    <option value="">All Months</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {/* Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Expected</span>
                    <span className="stat-value">₹{totalExpected.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Collected</span>
                    <span className="stat-value" style={{ color: 'var(--status-paid)' }}>₹{totalCollected.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Collection Rate</span>
                    <span className="stat-value">{totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0}%</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Records</span>
                    <span className="stat-value">{filtered.length}</span>
                </div>
            </div>

            {/* Status Breakdown */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>📊 Status Breakdown</h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{paidCount}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>✅ Paid</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>{partialCount}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⚠️ Partial</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{unpaidCount}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>❌ Unpaid</div>
                    </div>
                </div>
            </div>

            {/* Payment Mode Breakdown */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>💳 Payment Mode Breakdown</h3>
                {Object.keys(modeStats).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No data yet</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(modeStats).map(([mode, stat]) => {
                            const pct = totalCollected > 0 ? Math.round((stat.total / totalCollected) * 100) : 0;
                            return (
                                <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ minWidth: '90px', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {modeIcons[mode] || '💰'} {mode}
                                    </div>
                                    <div style={{ flex: 1, height: '28px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{
                                            width: `${pct}%`, height: '100%', background: modeColors[mode] || '#666',
                                            borderRadius: 'var(--radius-sm)', transition: 'width 0.5s ease',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {pct > 10 && <span style={{ color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>{pct}%</span>}
                                        </div>
                                    </div>
                                    <div style={{ minWidth: '120px', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700 }}>₹{stat.total.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.count} entries</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Monthly Summary Table */}
            {!filterMonth && months.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>📅 Monthly Summary</h3>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Records</th>
                                    <th>Expected</th>
                                    <th>Collected</th>
                                    <th>Rate</th>
                                    <th>Paid</th>
                                    <th>Partial</th>
                                </tr>
                            </thead>
                            <tbody>
                                {months.map(month => {
                                    const mp = payments.filter(p => p.periodMonth === month);
                                    const mExp = mp.reduce((s, p) => s + Number(p.expectedAmount || 0), 0);
                                    const mColl = mp.reduce((s, p) => s + Number(p.receivedAmount || 0), 0);
                                    const mPaid = mp.filter(p => p.status === 'paid').length;
                                    const mPartial = mp.filter(p => p.status === 'partial').length;
                                    const rate = mExp > 0 ? Math.round((mColl / mExp) * 100) : 0;
                                    return (
                                        <tr key={month} style={{ cursor: 'pointer' }} onClick={() => setFilterMonth(month)}>
                                            <td style={{ fontWeight: 600 }}>{month}</td>
                                            <td>{mp.length}</td>
                                            <td>₹{mExp.toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--status-paid)' }}>₹{mColl.toLocaleString()}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                                                    background: rate >= 90 ? 'rgba(16,185,129,0.15)' : rate >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: rate >= 90 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444',
                                                }}>{rate}%</span>
                                            </td>
                                            <td style={{ color: '#10b981' }}>{mPaid}</td>
                                            <td style={{ color: '#f59e0b' }}>{mPartial}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
