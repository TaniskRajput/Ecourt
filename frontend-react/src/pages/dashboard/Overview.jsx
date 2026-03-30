import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getMyCases, getAllCases } from '../../services/api';
import StatusChip from '../../components/StatusChip';

function AnimatedCounter({ value }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (value === 0) { setCount(0); return; }
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

export default function Overview() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = user.role === 'ADMIN'
                ? await getAllCases()
                : await getMyCases();
            setCases(res.data || []);
        } catch (err) {
            if (err.response?.status !== 403) {
                setError('Failed to load data.');
            }
        } finally {
            setLoading(false);
        }
    };

    const total = cases.length;
    const active = cases.filter(c => ['FILED', 'SCRUTINY', 'HEARING', 'ARGUMENT', 'JUDGMENT'].includes((c.status || '').toUpperCase())).length;
    const closed = cases.filter(c => (c.status || '').toUpperCase() === 'CLOSED').length;

    const formatDate = (d) => {
        if (!d) return 'N/A';
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: (i) => ({
            opacity: 1, y: 0, scale: 1,
            transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' }
        })
    };

    const rowVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: (i) => ({
            opacity: 1, x: 0,
            transition: { delay: i * 0.03, duration: 0.3 }
        })
    };

    return (
        <div className="dash-view active">
            {/* Stat Cards */}
            <div className="stats-row">
                {[
                    { title: 'Total Cases', value: total, cls: 'blue-card' },
                    { title: 'Active Cases', value: active, cls: 'light-blue-card' },
                    { title: 'Closed Cases', value: closed, cls: '', style: { background: '#ede9fe' } },
                ].map((card, i) => (
                    <motion.div
                        key={card.title}
                        className={`stat-card ${card.cls}`}
                        style={card.style}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="stat-title">{card.title}</div>
                        <div className="stat-value"><AnimatedCounter value={card.value} /></div>
                    </motion.div>
                ))}
            </div>

            {/* Welcome Banner */}
            <motion.div
                className="welcome-banner"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                Welcome <strong>{user.username}</strong> (<span>{user.role}</span>)
            </motion.div>

            {/* Cases Table */}
            <motion.div
                className="table-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <table className="data-table clickable-rows">
                    <thead>
                        <tr>
                            <th>Case Number</th>
                            <th>Title</th>
                            <th>Client</th>
                            <th>Judge</th>
                            <th>Filed Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
                        ) : error ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', color: '#ef4444' }}>{error}</td></tr>
                        ) : cases.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No cases found.</td></tr>
                        ) : (
                            cases.map((c, i) => (
                                <motion.tr
                                    key={c.caseNumber || i}
                                    custom={i}
                                    variants={rowVariants}
                                    initial="hidden"
                                    animate="visible"
                                    onClick={() => navigate(`/dashboard/case/${c.caseNumber}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{c.caseNumber || 'N/A'}</td>
                                    <td>{c.title || 'Untitled'}</td>
                                    <td>{c.clientUsername || '—'}</td>
                                    <td>{c.judgeUsername || 'Unassigned'}</td>
                                    <td>{formatDate(c.filedDate)}</td>
                                    <td><StatusChip status={c.status} /></td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
}
