import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    assignJudge,
    downloadDocument,
    getAllUsers,
    getAuditTrail,
    getCaseByNumber,
    getCaseDocuments,
    updateCaseStatus,
    uploadDocument,
} from '../../services/api';
import StatusChip from '../../components/StatusChip';

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

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function eventToStep(eventType, details) {
    if (eventType === 'CASE_CREATED') return 'Filed';
    if (eventType === 'JUDGE_ASSIGNED') return 'Judge Assigned';
    if (eventType === 'CASE_CLOSED') return 'Closed';
    if (details?.includes('to SCRUTINY')) return 'Scrutiny';
    if (details?.includes('to HEARING')) return 'Hearing';
    if (details?.includes('to ARGUMENT')) return 'Argument';
    if (details?.includes('to JUDGMENT')) return 'Judgment';
    return eventType;
}

export default function CaseDetail() {
    const { caseNumber } = useParams();
    const navigate = useNavigate();

    const [caseData, setCaseData] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [auditEvents, setAuditEvents] = useState([]);
    const [judges, setJudges] = useState([]);
    const [selectedJudge, setSelectedJudge] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: '', isError: false });
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [assigningJudge, setAssigningJudge] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadCase() {
            setLoading(true);
            setError('');
            try {
                const [caseRes, docsRes, auditRes, judgesRes] = await Promise.all([
                    getCaseByNumber(caseNumber),
                    getCaseDocuments(caseNumber).catch(() => ({ data: [] })),
                    getAuditTrail(caseNumber).catch(() => ({ data: [] })),
                    getAllUsers({ role: 'JUDGE', active: true, size: 100 }).catch(() => ({ data: { content: [] } })),
                ]);

                if (!active) return;

                setCaseData(caseRes.data);
                setDocuments(docsRes.data || []);
                setAuditEvents((auditRes.data || []).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)));
                setJudges(judgesRes.data?.content || []);
                setSelectedJudge(caseRes.data?.judgeUsername || '');
            } catch (err) {
                if (active) {
                    setError(err.response?.data?.message || 'Error loading case.');
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

    const timelineEvents = [...auditEvents]
        .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
        .map((event) => ({
            ...event,
            step: eventToStep(event.eventType, event.details),
        }));

    const refreshCaseData = async () => {
        const [caseRes, docsRes, auditRes] = await Promise.all([
            getCaseByNumber(caseNumber),
            getCaseDocuments(caseNumber).catch(() => ({ data: [] })),
            getAuditTrail(caseNumber).catch(() => ({ data: [] })),
        ]);
        setCaseData(caseRes.data);
        setDocuments(docsRes.data || []);
        setAuditEvents((auditRes.data || []).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)));
        setSelectedJudge(caseRes.data?.judgeUsername || '');
    };

    const handleStatusChange = async (event) => {
        const newStatus = event.target.value;
        if (!newStatus) return;

        setStatusUpdating(true);
        setActionMessage({ text: '', isError: false });
        try {
            const res = await updateCaseStatus(caseNumber, newStatus);
            await refreshCaseData();
            setActionMessage({ text: res.data?.message || 'Status updated.', isError: false });
        } catch (err) {
            setActionMessage({ text: err.response?.data?.message || 'Failed to update status.', isError: true });
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleAssignJudge = async () => {
        setAssigningJudge(true);
        setActionMessage({ text: '', isError: false });
        try {
            const res = await assignJudge(caseNumber, selectedJudge || undefined);
            await refreshCaseData();
            setActionMessage({ text: res.data?.message || 'Judge assigned successfully.', isError: false });
        } catch (err) {
            setActionMessage({ text: err.response?.data?.message || 'Unable to assign judge.', isError: true });
        } finally {
            setAssigningJudge(false);
        }
    };

    const handleUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setActionMessage({ text: '', isError: false });
        try {
            const res = await uploadDocument(caseNumber, file);
            await refreshCaseData();
            setActionMessage({
                text: `Uploaded ${res.data?.originalFilename || 'document'} successfully.`,
                isError: false,
            });
        } catch (err) {
            setActionMessage({ text: err.response?.data?.message || 'Upload failed.', isError: true });
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    if (loading) {
        return <div className="dash-view active"><p>Loading case details...</p></div>;
    }

    if (error) {
        return <div className="dash-view active"><p style={{ color: '#ef4444' }}>{error}</p></div>;
    }

    if (!caseData) {
        return null;
    }

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="back-link" onClick={() => navigate(-1)}>← Back</div>

            <motion.div
                className="case-detail-header"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ marginBottom: '0.4rem' }}>
                            {caseData.caseNumber} <StatusChip status={caseData.status} />
                        </h2>
                        <p style={{ fontSize: '1.05rem', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>{caseData.title || 'Untitled'}</p>
                        <p style={{ fontSize: '0.92rem', color: 'var(--text-gray)', marginBottom: 0 }}>{caseData.description || 'No description provided.'}</p>
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gap: '1rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        marginTop: '1.4rem',
                    }}
                >
                    {[
                        ['Client', caseData.clientUsername || '—'],
                        ['Lawyer', caseData.lawyerUsername || '—'],
                        ['Assigned Judge', caseData.judgeUsername || 'Unassigned'],
                        ['Filed Date', formatDate(caseData.filedDate)],
                        ['Created At', formatDateTime(caseData.createdAt)],
                        ['Last Updated', formatDateTime(caseData.updatedAt)],
                    ].map(([label, value]) => (
                        <div className="case-meta-item" key={label}>
                            <div className="meta-label">{label}</div>
                            <div className="meta-value">{value}</div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {actionMessage.text && (
                <div className={`message ${actionMessage.isError ? 'error-msg' : 'success-msg'}`} style={{ marginTop: '1rem' }}>
                    {actionMessage.text}
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gap: '1.5rem',
                    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(300px, 1fr)',
                    alignItems: 'start',
                    marginTop: '1.5rem',
                }}
            >
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div className="dash-form-card">
                        <h3 style={{ marginBottom: '1rem' }}>Case Workflow</h3>
                        {timelineEvents.length === 0 ? (
                            <p>No timeline events yet.</p>
                        ) : (
                            <div className="audit-timeline">
                                {timelineEvents.map((event, index) => (
                                    <motion.div
                                        className="audit-event"
                                        key={`${event.id}-${index}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                    >
                                        <div className="event-header">
                                            <span>
                                                <span className="event-type-badge">{event.step}</span>
                                                <span className="event-actor" style={{ marginLeft: '8px' }}>by {event.actorUsername || 'System'}</span>
                                            </span>
                                            <span className="event-time">{formatDateTime(event.occurredAt)}</span>
                                        </div>
                                        <div className="event-details">{event.details || '—'}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dash-form-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ marginBottom: '0.3rem' }}>Documents</h3>
                                <p style={{ margin: 0, color: 'var(--text-gray)' }}>Evidence, filings, and supporting material attached to this case.</p>
                            </div>
                            {caseData.canUploadDocuments && (
                                <label className="outline-btn" htmlFor="case-file-upload" style={{ cursor: uploading ? 'default' : 'pointer' }}>
                                    {uploading ? 'Uploading...' : 'Upload Document'}
                                </label>
                            )}
                        </div>

                        <input
                            type="file"
                            id="case-file-upload"
                            onChange={handleUpload}
                            style={{ display: 'none' }}
                            disabled={uploading || !caseData.canUploadDocuments}
                        />

                        {documents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📂</div>
                                <p>No documents uploaded yet.</p>
                            </div>
                        ) : (
                            <div className="doc-list">
                                {documents.map((document) => (
                                    <div className="doc-item" key={document.id}>
                                        <div className="doc-item-info">
                                            <div className="doc-icon">📄</div>
                                            <div className="doc-item-meta">
                                                <h4>{document.originalFilename}</h4>
                                                <span>
                                                    {formatBytes(document.sizeBytes)} · {document.contentType || '—'} · Uploaded by{' '}
                                                    <strong>{document.uploadedBy || '—'}</strong> · {formatDateTime(document.uploadedAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="doc-download-btn" onClick={() => downloadDocument(caseNumber, document.id)}>
                                            Download
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div className="dash-form-card">
                        <h3 style={{ marginBottom: '1rem' }}>Available Actions</h3>

                        {caseData.canAssignJudge && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 600 }}>Judge Management</label>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <select
                                        value={selectedJudge}
                                        onChange={(event) => setSelectedJudge(event.target.value)}
                                        style={{ flex: '1 1 220px' }}
                                    >
                                        <option value="">Assign to me / choose judge</option>
                                        {judges.map((judge) => (
                                            <option key={judge.id} value={judge.username}>{judge.username}</option>
                                        ))}
                                    </select>
                                    <button className="auth-submit-btn" disabled={assigningJudge} onClick={handleAssignJudge}>
                                        {assigningJudge ? 'Saving...' : 'Assign Judge'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {caseData.canUpdateStatus ? (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.45rem', fontWeight: 600 }}>Quick Status Update</label>
                                <select
                                    onChange={handleStatusChange}
                                    disabled={statusUpdating}
                                    value=""
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Move case to next phase...</option>
                                    {caseData.allowedNextStatuses?.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-gray)', marginTop: 0 }}>No workflow actions available for your role on this case.</p>
                        )}

                        <div style={{ display: 'grid', gap: '0.6rem', color: 'var(--text-gray)', fontSize: '0.92rem' }}>
                            <div>Can assign judge: <strong style={{ color: 'var(--text-dark)' }}>{caseData.canAssignJudge ? 'Yes' : 'No'}</strong></div>
                            <div>Can update status: <strong style={{ color: 'var(--text-dark)' }}>{caseData.canUpdateStatus ? 'Yes' : 'No'}</strong></div>
                            <div>Can upload documents: <strong style={{ color: 'var(--text-dark)' }}>{caseData.canUploadDocuments ? 'Yes' : 'No'}</strong></div>
                        </div>
                    </div>

                    <div className="dash-form-card">
                        <h3 style={{ marginBottom: '1rem' }}>Audit Trail</h3>
                        {auditEvents.length === 0 ? (
                            <p>No audit events recorded yet.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {auditEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        style={{
                                            padding: '0.95rem 1rem',
                                            borderRadius: '14px',
                                            background: 'rgba(15, 23, 42, 0.03)',
                                            border: '1px solid rgba(15, 23, 42, 0.08)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                                            <strong>{event.eventType}</strong>
                                            <span style={{ color: 'var(--text-gray)', fontSize: '0.82rem' }}>{formatDateTime(event.occurredAt)}</span>
                                        </div>
                                        <div style={{ marginBottom: '0.3rem' }}>{event.details}</div>
                                        <div style={{ color: 'var(--text-gray)', fontSize: '0.84rem' }}>Actor: {event.actorUsername}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
