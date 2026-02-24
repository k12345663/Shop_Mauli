'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CollectorSearch() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [renters, setRenters] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRenters();
    }, []);

    async function fetchRenters() {
        const { data } = await supabase
            .from('renters')
            .select('*, renter_shops(shop_id, shops(shop_no, complex_id, complexes(name), rent_amount, rent_collection_day))')
            .order('renter_code');
        setRenters(data || []);
        setResults(data || []);
        setLoading(false);
    }

    useEffect(() => {
        if (!search.trim()) {
            setResults(renters);
        } else {
            const s = search.toLowerCase();
            setResults(renters.filter(r =>
                r.renter_code.toLowerCase().includes(s) ||
                r.name.toLowerCase().includes(s)
            ));
        }
    }, [search, renters]);

    function handleSelect(renter) {
        router.push(`/collector/collect?renter_id=${renter.id}`);
    }

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>Search Renter</h1>
                <p>Enter a renter code or name to start collection</p>
            </div>

            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    className="search-input"
                    placeholder="Type renter code or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
            </div>

            {loading ? (
                <div className="loading-page"><div className="spinner"></div></div>
            ) : results.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <p>No renters found</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {results.map(renter => {
                        const shopList = renter.renter_shops?.map(rs => rs.shops) || [];
                        const totalRent = shopList.reduce((s, sh) => s + Number(sh?.rent_amount || 0), 0);
                        return (
                            <div
                                key={renter.id}
                                className="card"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelect(renter)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{renter.name}</div>
                                        <div style={{ color: 'var(--accent-primary-hover)', fontSize: '0.9rem', fontWeight: 600 }}>
                                            {renter.renter_code}
                                        </div>
                                        {renter.phone && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                                                📞 {renter.phone}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                            {shopList.map((sh, i) => (
                                                <span key={i} className="shop-tag">
                                                    {sh?.complexes?.name || '—'} - {sh?.shop_no} — ₹{Number(sh?.rent_amount || 0).toLocaleString()} (Due: {sh?.rent_collection_day || 1})
                                                </span>
                                            ))}
                                            {shopList.length === 0 && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No shops assigned</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{totalRent.toLocaleString()}</div>
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
