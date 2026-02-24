'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';
import MonthPicker from '@/components/MonthPicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PaymentsReport() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('month'); // 'month', 'range', 'day'
    const [monthFilter, setMonthFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [specificDate, setSpecificDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchFilter, setSearchFilter] = useState('');

    useEffect(() => {
        const now = new Date();
        const month = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        setMonthFilter(month.replace(' ', '-'));

        const today = now.toISOString().split('T')[0];
        setSpecificDate(today);
        setStartDate(today);
        setEndDate(today);
    }, []);

    useEffect(() => {
        if (monthFilter || startDate || specificDate) fetchPayments();
    }, [monthFilter, startDate, endDate, specificDate, filterType, statusFilter]);

    async function fetchPayments() {
        setLoading(true);
        let query = supabase
            .from('rent_payments')
            .select(`
                *,
                renters(
                    renter_code, 
                    name,
                    renter_shops(
                        shops(
                            shop_no,
                            complexes(name)
                        )
                    )
                ),
                profiles:collector_user_id(full_name)
            `);

        if (filterType === 'month') {
            query = query.eq('period_month', monthFilter);
        } else if (filterType === 'range') {
            if (startDate) query = query.gte('collection_date', startDate);
            if (endDate) query = query.lte('collection_date', endDate);
        } else if (filterType === 'day') {
            if (specificDate) query = query.eq('collection_date', specificDate);
        }

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data } = await query.order('collection_date', { ascending: false });
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

    const downloadPDF = () => {
        const doc = new jsPDF();
        const title = `Payments Report - ${filterType === 'month' ? monthFilter : filterType === 'range' ? `${startDate} to ${endDate}` : specificDate}`;

        doc.setFontSize(18);
        doc.text("RentFlow Management", 14, 20);
        doc.setFontSize(12);
        doc.text(title, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

        // Summary box
        doc.setDrawColor(200);
        doc.rect(14, 45, 182, 25);
        doc.text(`Total Records: ${filtered.length}`, 20, 55);
        doc.text(`Total Expected: Rs. ${totalExpected.toLocaleString()}`, 20, 62);
        doc.text(`Total Received: Rs. ${totalReceived.toLocaleString()}`, 100, 62);

        const tableData = [];
        const groups = {};

        // Group filtered payments by complex
        filtered.forEach(p => {
            const complexNames = [...new Set(p.renters?.renter_shops?.map(rs => rs.shops?.complexes?.name) || [])].join(', ') || 'Unassigned';
            if (!groups[complexNames]) groups[complexNames] = [];
            groups[complexNames].push(p);
        });

        Object.keys(groups).sort().forEach(complexName => {
            // Group Header row
            tableData.push([{ content: complexName, colSpan: 7, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);

            groups[complexName].forEach(p => {
                const shops = p.renters?.renter_shops?.map(rs => rs.shops?.shop_no).join(', ') || '—';
                tableData.push([
                    p.renters?.renter_code || '—',
                    p.renters?.name || '—',
                    shops,
                    `Rs. ${Number(p.expected_amount).toLocaleString()}`,
                    `Rs. ${Number(p.received_amount).toLocaleString()}`,
                    p.status.toUpperCase(),
                    p.collection_date || p.period_month
                ]);
            });
        });

        autoTable(doc, {
            startY: 80,
            head: [['Code', 'Renter', 'Shops', 'Expected', 'Received', 'Status', 'Date/Period']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },
                2: { cellWidth: 30 }
            }
        });

        doc.save(`RentFlow_Report_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Payments Report</h1>
                    <p>View all rent payment records</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={downloadPDF}
                    disabled={filtered.length === 0}
                >
                    📥 Download PDF
                </button>
            </div>

            <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {['month', 'range', 'day'].map(type => (
                        <button
                            key={type}
                            className={`btn ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilterType(type)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {type === 'range' ? 'Date Range' : type === 'day' ? 'Single Day' : 'Monthwise'}
                        </button>
                    ))}
                </div>

                <div className="toolbar" style={{ flexWrap: 'wrap', gap: '20px', background: 'transparent', padding: 0 }}>
                    <div className="toolbar-filters" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {filterType === 'month' && (
                            <MonthPicker
                                value={monthFilter}
                                onChange={setMonthFilter}
                                label="Period Month"
                            />
                        )}

                        {filterType === 'range' && (
                            <>
                                <div>
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {filterType === 'day' && (
                            <div>
                                <label className="form-label">Specific Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={specificDate}
                                    onChange={e => setSpecificDate(e.target.value)}
                                />
                            </div>
                        )}

                        <div style={{ minWidth: '150px' }}>
                            <label className="form-label">Status</label>
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
                    </div>

                    <div className="search-container" style={{ marginBottom: 0, maxWidth: 300, alignSelf: 'flex-end' }}>
                        <span className="search-icon">🔍</span>
                        <input
                            className="search-input"
                            placeholder="Search renter..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                        />
                    </div>
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
                <div className="loading-page" style={{ height: '300px' }}><div className="spinner"></div></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state card">
                    <div className="empty-icon">💰</div>
                    <p>No payment records found for the selected criteria</p>
                </div>
            ) : (
                <div className="table-container card" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Complex</th>
                                <th>Renter</th>
                                <th>Name</th>
                                <th>Expected</th>
                                <th>Received</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => {
                                const complexNames = [...new Set(p.renters?.renter_shops?.map(rs => rs.shops?.complexes?.name) || [])].join(', ') || '—';
                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            {complexNames}
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>
                                            {p.renters?.renter_code || '—'}
                                        </td>
                                        <td>{p.renters?.name || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>₹{Number(p.expected_amount).toLocaleString()}</td>
                                        <td style={{ fontWeight: 700 }}>₹{Number(p.received_amount).toLocaleString()}</td>
                                        <td><StatusBadge status={p.status} /></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {p.collection_date ? new Date(p.collection_date).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
