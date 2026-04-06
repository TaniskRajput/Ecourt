import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { downloadPublicOrder, getPublicCaseTrackingDetail } from '../services/api';

function formatDate(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export default function CaseHistoryPage() {
    const { caseNumber } = useParams();
    const navigate = useNavigate();
    const [caseDetail, setCaseDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadCase() {
            setLoading(true);
            setError('');
            try {
                const response = await getPublicCaseTrackingDetail(caseNumber);
                if (active) {
                    setCaseDetail(response.data);
                }
            } catch (err) {
                if (active) {
                    setError(err.response?.data?.message || 'Unable to load case history.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadCase();
        return () => {
            active = false;
        };
    }, [caseNumber]);

    if (loading) {
        return <section className="public-page-shell"><div className="public-page-card"><p>Loading case history...</p></div></section>;
    }

    if (error) {
        return <section className="public-page-shell"><div className="public-page-card"><p style={{ color: '#ef4444' }}>{error}</p></div></section>;
    }

    if (!caseDetail) return null;

    return (
        <motion.section
            className="public-page-shell"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="public-page-card">
                <button className="outline-btn" style={{ marginBottom: '1rem' }} onClick={() => navigate('/track-case')}>
                    Back to Search
                </button>

                <div className="public-history-header">
                    <div>
                        <h1>Hearing History & Orders</h1>
                        <div className="public-case-number">Case Number: {caseDetail.caseNumber}</div>
                    </div>
                    <div className="public-history-summary">
                        <div>Status: <strong>{caseDetail.status}</strong></div>
                        <div>Court: <strong>{caseDetail.courtName || 'Not specified'}</strong></div>
                        <div>Updated: <strong>{formatDate(caseDetail.updatedAt)}</strong></div>
                    </div>
                </div>

                <div className="history-layout">
                    <div className="public-info-panel">
                        <h2>Hearing History</h2>
                        {caseDetail.hearings.length === 0 ? (
                            <div className="empty-state"><p>No hearings recorded yet.</p></div>
                        ) : (
                            <div className="hearing-table-wrapper">
                                <table className="public-history-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Judge</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {caseDetail.hearings.map((hearing) => (
                                            <tr key={hearing.id}>
                                                <td>{formatDate(hearing.hearingDate)}</td>
                                                <td>{hearing.judgeName}</td>
                                                <td>
                                                    <div>{hearing.remarks}</div>
                                                    {hearing.nextHearingDate && (
                                                        <div className="history-subtext">Next date: {formatDate(hearing.nextHearingDate)}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="public-info-panel">
                        <h2>Court Orders / Judgments</h2>
                        {caseDetail.orders.length === 0 ? (
                            <div className="empty-state"><p>No court orders uploaded yet.</p></div>
                        ) : (
                            <div className="public-order-list">
                                {caseDetail.orders.map((order) => (
                                    <article key={order.id} className="public-order-card">
                                        <div>
                                            <h3>{order.documentTitle || order.originalFilename}</h3>
                                            <div className="history-subtext">{order.orderType || 'Court Order'} dated {formatDate(order.orderDate)}</div>
                                        </div>
                                        <button className="auth-submit-btn" onClick={() => downloadPublicOrder(caseDetail.caseNumber, order.id)}>
                                            Download PDF
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.section>
    );
}
