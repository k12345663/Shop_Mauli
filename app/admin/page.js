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
        totalPortfolioDeposit: 0,
        totalPortfolioRent: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
        complexStats: [] // [{ name: '', shops: 0, deposit: 0, rentPotential: 0 }]
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

        const [shopRes, renterRes, paymentRes, complexRes] = await Promise.all([
            supabase.from('shops').select('id, rent_amount, complex_id', { count: 'exact' }).eq('is_active', true),
            supabase.from('renters').select('id', { count: 'exact', head: true }),
            supabase.from('rent_payments').select('*').eq('period_month', currentMonth),
            supabase.from('complexes').select('id, name, shops(id, rent_amount, renter_shops(deposit_amount))')
        ]);

        const payments = paymentRes.data || [];
        const totalReceived = payments.reduce((s, p) => s + Number(p.received_amount), 0);

        // Calculate complex-wise stats accurately
        const complexStats = (complexRes.data || []).map(comp => {
            const shops = comp.shops || [];
            const rentPotential = shops.reduce((s, shop) => s + Number(shop.rent_amount || 0), 0);
            const totalDeposit = shops.reduce((s, shop) => {
                const dep = shop.renter_shops?.reduce((ds, rs) => ds + Number(rs.deposit_amount || 0), 0) || 0;
                return s + dep;
            }, 0);
            return {
                name: comp.name,
                shopCount: shops.length,
                deposit: totalDeposit,
                rentPotential
            };
        });

        const totalPortfolioDeposit = complexStats.reduce((s, c) => s + c.deposit, 0);
        const totalPortfolioRent = complexStats.reduce((s, c) => s + c.rentPotential, 0);

        setStats({
            totalShops: shopRes.count || 0,
            totalRenters: renterRes.count || 0,
            totalExpected: totalPortfolioRent,
            totalReceived,
            totalPortfolioDeposit,
            totalPortfolioRent,
            complexStats,
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
                    <h1>RentFlow Dashboard</h1>
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
                    {/* Complex-wise Breakdown */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 700 }}>Complex-wise Breakdown</h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Total Portfolio: ₹{stats.totalPortfolioDeposit.toLocaleString()} (Deposit) | ₹{stats.totalPortfolioRent.toLocaleString()} (Rent)
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {stats.complexStats.map(comp => (
                                <div key={comp.name} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--accent-primary)' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{comp.name}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shops</div>
                                            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{comp.shopCount}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Rent</div>
                                            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--status-paid)' }}>₹{comp.rentPotential.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cumulative Deposit</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>₹{comp.deposit.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Collection for current month */}
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Current Collection Progress ({currentMonth})</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-label">Expected Rent</div>
                                <div className="stat-value">₹{stats.totalExpected.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Total Received</div>
                                <div className="stat-value" style={{ color: 'var(--status-paid)' }}>₹{stats.totalReceived.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Pending Collection</div>
                                <div className="stat-value" style={{ color: 'var(--status-unpaid)' }}>₹{pending.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Collection Rate</div>
                                <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{collectionRate}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
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
