'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalShops: 0,
        totalRenters: 0,
        totalExpected: 0,
        totalReceived: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
    });
    const [currentMonth, setCurrentMonth] = useState('');
    const [loading, setLoading] = useState(true);

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
            supabase.from('rent_payments').select('*').eq('period_month', currentMonth),
        ]);

        const payments = paymentRes.data || [];
        const totalExpected = payments.reduce((s, p) => s + Number(p.expected_amount), 0);
        const totalReceived = payments.reduce((s, p) => s + Number(p.received_amount), 0);

        setStats({
            totalShops: shopRes.count || 0,
            totalRenters: renterRes.count || 0,
            totalExpected,
            totalReceived,
            paidCount: payments.filter(p => p.status === 'paid').length,
            partialCount: payments.filter(p => p.status === 'partial').length,
            unpaidCount: payments.filter(p => p.status === 'unpaid').length,
        });

        setLoading(false);
    }

    const pending = stats.totalExpected - stats.totalReceived;
    const collectionRate = stats.totalExpected > 0
        ? Math.round((stats.totalReceived / stats.totalExpected) * 100)
        : 0;

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1>DBA Dashboard</h1>
                    <p>Overview for {currentMonth}</p>
                </div>
                <div className="badge" style={{ background: 'var(--status-paid)', color: 'white', padding: '6px 12px' }}>
                    Real-time Active
                </div>
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : (
                <>
                    {/* Primary Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-label">Active Shops</div>
                            <div className="stat-value">{stats.totalShops}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Total Renters</div>
                            <div className="stat-value">{stats.totalRenters}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Total Received</div>
                            <div className="stat-value" style={{ color: 'var(--status-paid)' }}>₹{stats.totalReceived.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Pending Amount</div>
                            <div className="stat-value" style={{ color: 'var(--status-unpaid)' }}>₹{pending.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Quick Actions for DBA */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Quick Actions</h3>
                        <div className="quick-actions">
                            <Link href="/admin/renters" className="action-btn">
                                <span className="action-icon">👤</span>
                                <span className="action-label">Add Renter</span>
                            </Link>
                            <Link href="/admin/shops" className="action-btn">
                                <span className="action-icon">🏪</span>
                                <span className="action-label">Add Shop</span>
                            </Link>
                            <Link href="/admin/assign" className="action-btn">
                                <span className="action-icon">🔗</span>
                                <span className="action-label">Assign Shop</span>
                            </Link>
                            <Link href="/admin/payments" className="action-btn">
                                <span className="action-icon">📊</span>
                                <span className="action-label">Report</span>
                            </Link>
                        </div>
                    </div>

                    {/* Progress Card */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 700 }}>Collection Progress</h3>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{collectionRate}%</span>
                        </div>
                        <div className="progress-bar" style={{ height: '12px', background: 'var(--bg-input)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div className="progress-fill" style={{ width: `${collectionRate}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            <span>Collected: ₹{stats.totalReceived.toLocaleString()}</span>
                            <span>Target: ₹{stats.totalExpected.toLocaleString()}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
