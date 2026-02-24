'use client';

import { useState, useRef, useEffect } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthPicker({ value, onChange, label = "Select Month" }) {
    const [showPicker, setShowPicker] = useState(false);
    const [pickerYear, setPickerYear] = useState(() => {
        // Extract year from value like "Feb-2026" or use current year
        const parts = value?.split('-');
        return parts?.[1] ? parseInt(parts[1]) : new Date().getFullYear();
    });
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowPicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMonthSelect = (month) => {
        const newValue = `${month}-${pickerYear}`;
        onChange(newValue);
        setShowPicker(false);
    };

    return (
        <div className="month-picker-container" ref={containerRef} style={{ position: 'relative', minWidth: '180px' }}>
            {label && <label className="form-label" style={{ marginBottom: '4px', fontSize: '0.85rem', display: 'block' }}>{label}</label>}
            <div
                className="form-input"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'var(--bg-card)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                }}
                onClick={() => setShowPicker(!showPicker)}
            >
                <span>{value || 'Select month...'}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>📅 ▼</span>
            </div>

            {showPicker && (
                <div className="card animate-in" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    padding: '16px',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    minWidth: '220px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); setPickerYear(y => y - 1); }}
                            style={{ padding: '4px 8px' }}
                        >◀</button>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{pickerYear}</div>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); setPickerYear(y => y + 1); }}
                            style={{ padding: '4px 8px' }}
                        >▶</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {MONTHS.map(m => {
                            const mText = `${m}-${pickerYear}`;
                            const isSelected = value === mText;
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleMonthSelect(m); }}
                                    style={{
                                        padding: '8px 4px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: 'none',
                                        background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: isSelected ? 'white' : 'var(--text-primary)',
                                        fontWeight: isSelected ? 700 : 400,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
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
    );
}
