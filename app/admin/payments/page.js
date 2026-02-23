'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';

export default function PaymentsReport() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthFilter, setMonthFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchFilter, setSearchFilter] = useState('');

    useEffect(() => {
        const now = new Date();
        const month = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        setMonthFilter(month.replace(' ', '-'));
    }, []);

    useEffect(() => {
        if (monthFilter) fetchPayments();
    }, [monthFilter, statusFilter]);

    async function fetchPayments() {
        setLoading(true);
        let query = supabase
            .from('rent_payments')
            .select('*, renters(renter_code, name), profiles(full_name)')
            .eq('period_month', monthFilter)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data } = await query;
        setPayments(data || []);
        setLoading(false);
    }

    const filtered = payments.filter(p => {
        if (!searchFilter) return true;
        const s = searchFilter.toLowerCase();
        return (
            p.renters?.renter_code?.toLowerCase().includes(s) ||
            p.renters?.name?.toLowerCase().includes(s)
        );
    });

    const totalExpected = filtered.reduce((s, p) => s + Number(p.expected_amount), 0);
    const totalReceived = filtered.reduce((s, p) => s + Number(p.received_amount), 0);

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Payments Report</h1>
                <p>View all rent payment records</p>
            </div>

            <div className="toolbar">
                <div className="toolbar-filters">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Month (e.g. Feb-2026)"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        style={{ width: '180px' }}
                    />
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="paid">✅ Paid</option>
                        <option value="partial">⚠️ Partial</option>
                        <option value="unpaid">❌ Unpaid</option>
                    </select>
                </div>
                <div className="search-container" style={{ marginBottom: 0, maxWidth: 300 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        className="search-input"
                        placeholder="Search renter..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Summary row */}
            <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                    <span className="stat-label">Records</span>
                    <span className="stat-value">{filtered.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Expected</span>
                    <span className="stat-value">₹{totalExpected.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Received</span>
                    <span className="stat-value">₹{totalReceived.toLocaleString()}</span>
                </div>
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <p>No payment records found for {monthFilter}</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Renter</th>
                                <th>Name</th>
                                <th>Expected</th>
                                <th>Received</th>
                                <th>Status</th>
                                <th>Collector</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>
                                        {p.renters?.renter_code || '—'}
                                    </td>
                                    <td>{p.renters?.name || '—'}</td>
                                    <td>₹{Number(p.expected_amount).toLocaleString()}</td>
                                    <td style={{ fontWeight: 600 }}>₹{Number(p.received_amount).toLocaleString()}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {p.profiles?.full_name || '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
