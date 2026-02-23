'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';

export default function CollectorHistory() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    async function fetchHistory() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('rent_payments')
            .select('*, renters(renter_code, name)')
            .eq('collector_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);

        setPayments(data || []);
        setLoading(false);
    }

    const totalCollected = payments.reduce((s, p) => s + Number(p.received_amount), 0);

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>My Collection History</h1>
                <p>All payments you've recorded</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card">
                    <span className="stat-label">Total Records</span>
                    <span className="stat-value">{payments.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Collected</span>
                    <span className="stat-value">₹{totalCollected.toLocaleString()}</span>
                </div>
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : payments.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <p>No collections yet</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Renter</th>
                                <th>Name</th>
                                <th>Month</th>
                                <th>Expected</th>
                                <th>Received</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p) => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>
                                        {p.renters?.renter_code || '—'}
                                    </td>
                                    <td>{p.renters?.name || '—'}</td>
                                    <td>{p.period_month}</td>
                                    <td>₹{Number(p.expected_amount).toLocaleString()}</td>
                                    <td style={{ fontWeight: 600 }}>₹{Number(p.received_amount).toLocaleString()}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {p.collection_date ? new Date(p.collection_date).toLocaleDateString('en-IN') : new Date(p.created_at).toLocaleDateString('en-IN')}
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
