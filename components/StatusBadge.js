export default function StatusBadge({ status }) {
    const map = {
        paid: { className: 'badge badge-paid', label: '✅ Paid' },
        partial: { className: 'badge badge-partial', label: '⚠️ Partial' },
        unpaid: { className: 'badge badge-unpaid', label: '❌ Unpaid' },
    };

    const info = map[status] || { className: 'badge', label: status };

    return <span className={info.className}>{info.label}</span>;
}
