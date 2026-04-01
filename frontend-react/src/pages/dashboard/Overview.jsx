import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getDashboardSummary } from '../../services/api';
import StatusChip from '../../components/StatusChip';

function AnimatedCounter({ value }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (value === 0) {
            setCount(0);
            return;
        }

        let start = 0;
        const duration = 800;
        const increment = value / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [value]);

    return <>{count}</>;
}

function formatDate(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatDateTime(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function Overview() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadData() {
            setLoading(true);
            setError('');
            try {
                const res = await getDashboardSummary();
                if (active) {
                    setSummary(res.data);
                }
            } catch (err) {
                if (active) {
                    setError('Failed to load dashboard.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadData();
        return () => {
            active = false;
        };
    }, []);

    const role = user?.role || '';
    const cards = summary ? (() => {
        if (role === 'ADMIN') {
            return [
                { title: 'Cases Under Oversight', value: summary.totalCases, cls: 'blue-card' },
                { title: 'Unassigned Cases', value: summary.unassignedCases, cls: 'light-blue-card' },
                { title: 'Active Judges', value: summary.activeJudges, cls: '' },
                { title: 'Total Users', value: summary.totalUsers, cls: '' },
            ];
        }

        if (role === 'JUDGE') {
            return [
                { title: 'Visible Cases', value: summary.totalCases, cls: 'blue-card' },
                { title: 'Pending Actions', value: summary.pendingActions, cls: 'light-blue-card' },
                { title: 'Unassigned Cases', value: summary.unassignedCases, cls: '' },
            ];
        }

        return [
            { title: 'Filed Cases', value: summary.totalCases, cls: 'blue-card' },
            { title: 'Active Cases', value: summary.activeCases, cls: 'light-blue-card' },
            { title: 'Recent Actions', value: summary.recentActions?.length || 0, cls: '' },
        ];
    })() : [];

    const rowVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: (index) => ({
            opacity: 1,
            x: 0,
            transition: { delay: index * 0.04, duration: 0.28 }
        }),
    };

    return (
        <div className="dash-view active">
            <motion.div
                className="welcome-banner"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
            >
                Welcome <strong>{user?.username}</strong> (<span>{role}</span>)
            </motion.div>

            <div className="stats-row">
                {cards.map((card, index) => (
                    <motion.div
                        key={card.title}
                        className={`stat-card ${card.cls}`}
                        custom={index}
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.08, duration: 0.32 }}
                    >
                        <div className="stat-title">{card.title}</div>
                        <div className="stat-value">
                            <AnimatedCounter value={card.value || 0} />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div
                style={{
                    display: 'grid',
                    gap: '1.5rem',
                    gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
                    alignItems: 'start',
                }}
            >
                <motion.div
                    className="table-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ marginBottom: '0.25rem' }}>Recent Cases</h3>
                            <p style={{ color: 'var(--text-gray)', margin: 0, fontSize: '0.95rem' }}>
                                {role === 'ADMIN'
                                    ? 'System-wide case oversight snapshot.'
                                    : role === 'JUDGE'
                                        ? 'Latest case activity across the full docket visible to you.'
                                        : 'Your most recently updated cases.'}
                            </p>
                        </div>
                        <button className="outline-btn" onClick={() => navigate('/dashboard/search')}>
                            Open Search
                        </button>
                    </div>

                    <table className="data-table clickable-rows">
                        <thead>
                            <tr>
                                <th>Case Number</th>
                                <th>Title</th>
                                <th>Client</th>
                                <th>Judge</th>
                                <th>Updated</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading dashboard...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                            ) : summary?.recentCases?.length ? (
                                summary.recentCases.map((courtCase, index) => (
                                    <motion.tr
                                        key={courtCase.caseNumber}
                                        custom={index}
                                        variants={rowVariants}
                                        initial="hidden"
                                        animate="visible"
                                        onClick={() => navigate(`/dashboard/case/${courtCase.caseNumber}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{courtCase.caseNumber}</td>
                                        <td>{courtCase.title || 'Untitled'}</td>
                                        <td>{courtCase.clientUsername || '—'}</td>
                                        <td>{courtCase.judgeUsername || 'Unassigned'}</td>
                                        <td>{formatDateTime(courtCase.updatedAt)}</td>
                                        <td><StatusChip status={courtCase.status} /></td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No cases to show yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </motion.div>

                <motion.div
                    className="table-container"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
                        <h3 style={{ marginBottom: '0.25rem' }}>Recent Actions</h3>
                        <p style={{ color: 'var(--text-gray)', margin: 0, fontSize: '0.95rem' }}>
                            Audit activity across the cases visible to you.
                        </p>
                    </div>

                    <div className="overview-activity-scroll">
                        {loading ? (
                            <div className="overview-activity-empty">Loading activity...</div>
                        ) : error ? (
                            <div className="overview-activity-empty" style={{ color: '#ef4444' }}>{error}</div>
                        ) : summary?.recentActions?.length ? (
                            <div className="overview-activity-list">
                                {summary.recentActions.map((event) => (
                                    <div key={event.id} className="overview-activity-item">
                                        <div className="overview-activity-top">
                                            <strong>{event.eventType}</strong>
                                            <span>{formatDateTime(event.occurredAt)}</span>
                                        </div>
                                        <div className="overview-activity-details">{event.details}</div>
                                        <div className="overview-activity-actor">Actor: {event.actorUsername}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="overview-activity-empty">No recent actions yet.</div>
                        )}
                    </div>

                    {summary && (
                        <div style={{ margin: '0 1.5rem 1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(15, 23, 42, 0.08)' }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>Snapshot</h4>
                            <div style={{ display: 'grid', gap: '0.5rem', color: 'var(--text-gray)', fontSize: '0.92rem' }}>
                                <div>Total cases visible to you: <strong style={{ color: 'var(--text-dark)' }}>{summary.totalCases}</strong></div>
                                <div>Active matters: <strong style={{ color: 'var(--text-dark)' }}>{summary.activeCases}</strong></div>
                                <div>Closed matters: <strong style={{ color: 'var(--text-dark)' }}>{summary.closedCases}</strong></div>
                                <div>Latest filing date shown: <strong style={{ color: 'var(--text-dark)' }}>{summary.recentCases?.[0] ? formatDate(summary.recentCases[0].filedDate) : 'N/A'}</strong></div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
