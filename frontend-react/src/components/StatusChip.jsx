export default function StatusChip({ status }) {
    const s = (status || 'PENDING').toUpperCase();
    const cls = 'status-' + s.toLowerCase().replace(/ /g, '_');
    return <span className={`status-chip ${cls}`}>{s}</span>;
}
