'use client';

import { useState, useEffect } from 'react';
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
        try {
            let url = `/api/admin/payments?type=${filterType}`;
            if (filterType === 'month') url += `&month=${monthFilter}`;
            else if (filterType === 'range') url += `&startDate=${startDate}&endDate=${endDate}`;
            else if (filterType === 'day') url += `&specificDate=${specificDate}`;

            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch payments');

            const { recordedPayments, assignments } = data;

            // 3. Synthesize Full Report
            const fullReport = [];
            const paymentMap = {}; // renterId -> payment record

            (recordedPayments || []).forEach(p => {
                const rId = String(p.renterId || '').toLowerCase();
                paymentMap[rId] = p;
            });

            const seenPaymentIds = new Set();

            // Base the report on Assignments (all shops that SHOULD pay)
            (assignments || []).forEach(asn => {
                const rId = String(asn.renterId || '').toLowerCase();
                const payment = paymentMap[rId];

                if (payment) {
                    // Renter has a payment. Allocate it to this shop row.
                    const totalRenterRent = assignments
                        .filter(a => String(a.renterId).toLowerCase() === rId)
                        .reduce((s, a) => s + Number(a.shops?.rentAmount || 0), 0) || 1;

                    fullReport.push({
                        ...payment,
                        id: `${payment.id}-${asn.shopId}`, // Unique ID for table row
                        expectedAmount: asn.shops?.rentAmount || 0,
                        receivedAmount: payment.status === 'paid'
                            ? (asn.shops?.rentAmount || 0)
                            : (Number(payment.receivedAmount) * (Number(asn.shops?.rentAmount || 0) / totalRenterRent)),
                        complexName: asn.shops?.complexes?.name || '—',
                        shopNo: asn.shops?.shopNo || '—',
                        renterCode: asn.renters?.renterCode || '—',
                        renterName: asn.renters?.name || '—',
                        type: 'recorded'
                    });
                    seenPaymentIds.add(payment.id);
                } else if (filterType === 'month') {
                    // Missing entry for this shop
                    fullReport.push({
                        id: `missing-${asn.renterId}-${asn.shopId}`,
                        renterId: asn.renterId,
                        shopId: asn.shopId,
                        periodMonth: monthFilter,
                        expectedAmount: asn.shops?.rentAmount || 0,
                        receivedAmount: 0,
                        status: 'unpaid',
                        collectionDate: null,
                        complexName: asn.shops?.complexes?.name || '—',
                        shopNo: asn.shops?.shopNo || '—',
                        renterCode: asn.renters?.renterCode || '—',
                        renterName: asn.renters?.name || '—',
                        type: 'missing'
                    });
                }
            });

            // Add any recorded payments that DON'T match an active assignment
            (recordedPayments || []).forEach(p => {
                if (!seenPaymentIds.has(p.id)) {
                    fullReport.push({
                        ...p,
                        complexName: '—',
                        shopNo: '—',
                        renterCode: p.renters?.renterCode || '—',
                        renterName: p.renters?.name || '—',
                        type: 'recorded',
                        expectedAmount: p.expectedAmount,
                        receivedAmount: p.receivedAmount
                    });
                }
            });

            setPayments(fullReport);
        } catch (err) {
            console.error('Fetch payments error:', err);
        } finally {
            setLoading(false);
        }
    }

    const filtered = payments.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        if (!matchesStatus) return false;

        if (!searchFilter) return true;
        const s = searchFilter.toLowerCase();
        return (
            p.renterCode?.toLowerCase().includes(s) ||
            p.renterName?.toLowerCase().includes(s) ||
            p.shopNo?.toLowerCase().includes(s) ||
            p.complexName?.toLowerCase().includes(s)
        );
    });

    const totalExpected = filtered.reduce((s, p) => s + Number(p.expectedAmount || 0), 0);
    const totalReceived = filtered.reduce((s, p) => s + Number(p.receivedAmount || 0), 0);

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
            const complexNames = p.complexName || 'Unassigned';
            if (!groups[complexNames]) groups[complexNames] = [];
            groups[complexNames].push(p);
        });

        Object.keys(groups).sort().forEach(complexName => {
            // Group Header row
            tableData.push([{ content: complexName, colSpan: 7, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);

            groups[complexName].forEach(p => {
                tableData.push([
                    p.renterCode,
                    p.renterName,
                    p.shopNo,
                    `Rs. ${Number(p.expectedAmount || 0).toLocaleString()}`,
                    `Rs. ${Number(p.receivedAmount || 0).toLocaleString()}`,
                    p.status.toUpperCase(),
                    p.collectionDate
                        ? new Date(p.collectionDate).toLocaleDateString('en-IN')
                        : (p.periodMonth || '—')
                ]);
            });
        });

        autoTable(doc, {
            startY: 80,
            head: [['Code', 'Renter Name', 'Shop #', 'Expected', 'Received', 'Status', 'Date/Period']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 45 },
                2: { cellWidth: 20 },
                5: { cellWidth: 20 }
            }
        });

        doc.save(`RentFlow_Full_Report_${new Date().getTime()}.pdf`);
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
                                <th>Shop No</th>
                                <th>Expected</th>
                                <th>Received</th>
                                <th>Status</th>
                                <th>Date/Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => {
                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            {p.complexName}
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary-hover)' }}>
                                            {p.renterCode}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{p.renterName}</td>
                                        <td style={{ fontWeight: 600 }}>{p.shopNo}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>₹{Number(p.expectedAmount || 0).toLocaleString()}</td>
                                        <td style={{ fontWeight: 700 }}>₹{Number(p.receivedAmount || 0).toLocaleString()}</td>
                                        <td><StatusBadge status={p.status} /></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {p.collectionDate
                                                ? new Date(p.collectionDate).toLocaleDateString('en-IN')
                                                : p.periodMonth}
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
