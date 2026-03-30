import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCaseByNumber, getCaseDocuments, getAuditTrail, uploadDocument, downloadDocument, updateCaseStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusChip from '../../components/StatusChip';

function formatDate(d) {
    if (!d) return 'N/A';
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
}

function formatInstant(d) {
    if (!d) return 'N/A';
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : parsed.toLocaleString();
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
}

export default function CaseDetail() {
    const { caseNumber } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [caseData, setCaseData] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [auditEvents, setAuditEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('documents');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        loadCase();
    }, [caseNumber]);

    const loadCase = async () => {
        setLoading(true);
        setError('');
        try {
            const [caseRes, docsRes, auditRes] = await Promise.all([
                getCaseByNumber(caseNumber),
                getCaseDocuments(caseNumber).catch(() => ({ data: [] })),
                getAuditTrail(caseNumber).catch(() => ({ data: [] })),
            ]);
            setCaseData(caseRes.data);
            setDocuments(docsRes.data || []);
            const events = auditRes.data || [];
            events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
            setAuditEvents(events);
        } catch (err) {
            setError('Error loading case.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        if (!newStatus) return;
        setStatusUpdating(true);
        try {
            await updateCaseStatus(caseNumber, newStatus);
            await loadCase(); // Reloads case and audit
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setUploadResult(null);
        try {
            const res = await uploadDocument(caseNumber, file);
            setUploadResult(res.data);
            // Refresh docs and audit
            const [docsRes, auditRes] = await Promise.all([
                getCaseDocuments(caseNumber).catch(() => ({ data: [] })),
                getAuditTrail(caseNumber).catch(() => ({ data: [] })),
            ]);
            setDocuments(docsRes.data || []);
            const events = auditRes.data || [];
            events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
            setAuditEvents(events);
        } catch (err) {
            setUploadResult({ error: err.response?.data?.message || 'Upload failed.' });
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    if (loading) return <div className="dash-view active"><p>Loading case details...</p></div>;
    if (error) return <div className="dash-view active"><p style={{ color: '#ef4444' }}>{error}</p></div>;
    if (!caseData) return null;

    const c = caseData;

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="back-link" onClick={() => navigate(-1)}>← Back</div>

            {/* Case Header */}
            <motion.div
                className="case-detail-header"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h2>{c.caseNumber || 'N/A'} <StatusChip status={c.status} /></h2>

                {(user?.role === 'ADMIN' || (user?.role === 'JUDGE' && user?.username === c.judgeUsername)) && (
                    <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                        <select
                            onChange={handleStatusChange}
                            disabled={statusUpdating}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}
                            value=""
                        >
                            <option value="">Move to Phase...</option>
                            <option value="FILED">Filed</option>
                            <option value="SCRUTINY">Scrutiny</option>
                            <option value="HEARING">Hearing</option>
                            <option value="ARGUMENT">Argument</option>
                            <option value="JUDGMENT">Judgment</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                        {statusUpdating && <span style={{ fontSize: '0.8rem', marginLeft: '10px', color: 'var(--text-gray)' }}>Saving...</span>}
                    </div>
                )}

                <p style={{ fontSize: '1.05rem', color: 'var(--text-dark)', marginBottom: '4px' }}>{c.title || 'Untitled'}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-gray)' }}>{c.description || ''}</p>
                <div className="case-meta-grid">
                    {[
                        ['Client', c.clientUsername || '—'],
                        ['Lawyer', c.lawyerUsername || '—'],
                        ['Judge', c.judgeUsername || 'Unassigned'],
                        ['Filed Date', formatDate(c.filedDate)],
                        ['Created At', formatInstant(c.createdAt)],
                        ['Last Updated', formatInstant(c.updatedAt)],
                    ].map(([label, value]) => (
                        <div className="case-meta-item" key={label}>
                            <div className="meta-label">{label}</div>
                            <div className="meta-value">{value}</div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="detail-tabs">
                <button
                    className={`detail-tab ${activeTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                >Documents</button>
                <button
                    className={`detail-tab ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}
                >Audit Trail</button>
            </div>

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                    {/* Upload Zone */}
                    <div className="upload-zone">
                        <label className="upload-label" htmlFor="file-upload">📎 Click to upload a document</label>
                        <input type="file" id="file-upload" onChange={handleUpload} style={{ display: 'none' }} />
                        <div className="upload-hint">Supported: PDF, DOCX, images, etc.</div>
                    </div>

                    {uploading && <p style={{ color: 'var(--text-gray)', marginTop: '10px' }}>Uploading...</p>}

                    {uploadResult && !uploadResult.error && (
                        <motion.div className="doc-upload-result" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                            <h4>✓ Document Uploaded Successfully</h4>
                            <div className="upload-detail-grid">
                                <span className="ud-label">Filename</span><span>{uploadResult.originalFilename}</span>
                                <span className="ud-label">Size</span><span>{formatBytes(uploadResult.sizeBytes)}</span>
                                <span className="ud-label">Uploaded By</span><span>{uploadResult.uploadedBy || '—'}</span>
                                <span className="ud-label">Uploaded At</span><span>{formatInstant(uploadResult.uploadedAt)}</span>
                            </div>
                        </motion.div>
                    )}

                    {uploadResult?.error && (
                        <p style={{ color: '#ef4444', marginTop: '10px' }}>{uploadResult.error}</p>
                    )}

                    <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Case Documents</h4>
                    {documents.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📂</div>
                            <p>No documents uploaded yet.</p>
                        </div>
                    ) : (
                        <div className="doc-list">
                            {documents.map((doc, i) => (
                                <motion.div
                                    className="doc-item"
                                    key={doc.id || i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <div className="doc-item-info">
                                        <div className="doc-icon">📄</div>
                                        <div className="doc-item-meta">
                                            <h4>{doc.originalFilename || 'Unknown file'}</h4>
                                            <span>{formatBytes(doc.sizeBytes)} · {doc.contentType || '—'} · Uploaded by <strong>{doc.uploadedBy || '—'}</strong> · {formatInstant(doc.uploadedAt)}</span>
                                        </div>
                                    </div>
                                    <button className="doc-download-btn" onClick={() => downloadDocument(caseNumber, doc.id)}>Download</button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* Audit Tab */}
            {activeTab === 'audit' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                    {auditEvents.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <p>No audit events recorded yet.</p>
                        </div>
                    ) : (
                        <div className="audit-timeline">
                            {auditEvents.map((ev, i) => {
                                const typeCls = 'type-' + (ev.eventType || '').toLowerCase().replace(/ /g, '_');
                                return (
                                    <motion.div
                                        className="audit-event"
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <div className="event-header">
                                            <span>
                                                <span className={`event-type-badge ${typeCls}`}>{ev.eventType || 'EVENT'}</span>
                                                <span className="event-actor" style={{ marginLeft: '8px' }}>by {ev.actorUsername || 'System'}</span>
                                            </span>
                                            <span className="event-time">{formatInstant(ev.occurredAt)}</span>
                                        </div>
                                        <div className="event-details">{ev.details || '—'}</div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
