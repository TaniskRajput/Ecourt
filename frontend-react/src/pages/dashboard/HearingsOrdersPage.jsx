import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    addHearing,
    getAllUsers,
    getCaseByNumber,
    getHearings,
    getOrders,
    searchCases,
    uploadOrder,
} from '../../services/api';
import StatusChip from '../../components/StatusChip';

function formatDate(value) {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export default function HearingsOrdersPage() {
    const { user } = useAuth();
    const location = useLocation();
    const activeSection = location.pathname.includes('/orders') ? 'orders' : 'hearings';
    const role = user?.role || '';

    const [query, setQuery] = useState('');
    const [visibleCases, setVisibleCases] = useState([]);
    const [selectedCaseNumber, setSelectedCaseNumber] = useState('');
    const [selectedCase, setSelectedCase] = useState(null);
    const [hearings, setHearings] = useState([]);
    const [orders, setOrders] = useState([]);
    const [judges, setJudges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState({ text: '', isError: false });
    const [hearingForm, setHearingForm] = useState({
        hearingDate: '',
        nextHearingDate: '',
        judgeName: '',
        remarks: '',
    });
    const [orderForm, setOrderForm] = useState({
        title: '',
        orderType: 'Interim Order',
        orderDate: '',
        file: null,
    });
    const [submittingHearing, setSubmittingHearing] = useState(false);
    const [uploadingOrder, setUploadingOrder] = useState(false);

    const canAddNewCase = ['ADMIN', 'CLIENT', 'LAWYER'].includes(role);

    const caseOptions = useMemo(() => {
        if (!query.trim()) {
            return visibleCases;
        }
        const lowered = query.trim().toLowerCase();
        return visibleCases.filter((item) =>
            [item.caseNumber, item.title, item.clientUsername, item.judgeUsername]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(lowered))
        );
    }, [query, visibleCases]);

    const loadCases = async () => {
        setSearching(true);
        try {
            const response = await searchCases({
                scope: ['ADMIN', 'JUDGE'].includes(role) ? 'all' : 'my',
                page: 0,
                size: 50,
                sortBy: 'updatedAt',
                direction: 'desc',
            });
            setVisibleCases(response.data?.content || []);
            if (!selectedCaseNumber && response.data?.content?.length) {
                setSelectedCaseNumber(response.data.content[0].caseNumber);
            }
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to load cases.', isError: true });
        } finally {
            setSearching(false);
            setLoading(false);
        }
    };

    const loadCaseDetails = async (caseNumber) => {
        if (!caseNumber) {
            setSelectedCase(null);
            setHearings([]);
            setOrders([]);
            return;
        }

        try {
            const [caseRes, hearingsRes, ordersRes] = await Promise.all([
                getCaseByNumber(caseNumber),
                getHearings(caseNumber).catch(() => ({ data: [] })),
                getOrders(caseNumber).catch(() => ({ data: [] })),
            ]);
            setSelectedCase(caseRes.data);
            setHearings(hearingsRes.data || []);
            setOrders(ordersRes.data || []);
            setHearingForm((current) => ({
                ...current,
                judgeName: caseRes.data?.judgeUsername || current.judgeName,
            }));
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to load case details.', isError: true });
        }
    };

    useEffect(() => {
        let active = true;

        async function bootstrap() {
            try {
                await loadCases();
                if (['ADMIN', 'JUDGE'].includes(role)) {
                    const judgesRes = await getAllUsers({ role: 'JUDGE', active: true, size: 100 });
                    if (active) {
                        setJudges(judgesRes.data?.content || []);
                    }
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        bootstrap();
        return () => {
            active = false;
        };
    }, [role]);

    useEffect(() => {
        loadCaseDetails(selectedCaseNumber);
    }, [selectedCaseNumber]);

    const refreshSelectedCase = async () => {
        await loadCases();
        await loadCaseDetails(selectedCaseNumber);
    };

    const handleSubmitHearing = async (event) => {
        event.preventDefault();
        if (!selectedCaseNumber) return;
        setSubmittingHearing(true);
        setMessage({ text: '', isError: false });
        try {
            const response = await addHearing(selectedCaseNumber, hearingForm);
            await refreshSelectedCase();
            setHearingForm({
                hearingDate: '',
                nextHearingDate: '',
                judgeName: selectedCase?.judgeUsername || '',
                remarks: '',
            });
            setMessage({ text: `Hearing recorded for ${formatDate(response.data?.hearingDate)}.`, isError: false });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to submit hearing.', isError: true });
        } finally {
            setSubmittingHearing(false);
        }
    };

    const handleUploadOrder = async (event) => {
        event.preventDefault();
        if (!selectedCaseNumber || !orderForm.file) return;
        setUploadingOrder(true);
        setMessage({ text: '', isError: false });
        try {
            const response = await uploadOrder(selectedCaseNumber, orderForm);
            await refreshSelectedCase();
            setOrderForm({
                title: '',
                orderType: 'Interim Order',
                orderDate: '',
                file: null,
            });
            setMessage({
                text: `Order uploaded: ${response.data?.documentTitle || response.data?.originalFilename}.`,
                isError: false,
            });
        } catch (err) {
            setMessage({ text: err.response?.data?.message || 'Unable to upload order.', isError: true });
        } finally {
            setUploadingOrder(false);
        }
    };

    return (
        <motion.div
            className="dash-view active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h3>Manage Hearings & Orders</h3>
                    <p style={{ color: 'var(--text-gray)', marginTop: '0.4rem' }}>
                        Record hearings, upload court orders, and review the proceeding timeline for active matters.
                    </p>
                </div>
                {canAddNewCase && (
                    <Link className="outline-btn" to="/dashboard/file-case">Add New Case</Link>
                )}
            </div>

            <div className="hearings-toggle-row">
                <Link className={`filter-tag ${activeSection === 'hearings' ? 'active' : ''}`} to="/dashboard/hearings">Hearings</Link>
                <Link className={`filter-tag ${activeSection === 'orders' ? 'active' : ''}`} to="/dashboard/orders">Orders</Link>
            </div>

            {message.text && (
                <div className={`message ${message.isError ? 'error-msg' : 'success-msg'}`} style={{ marginTop: '1rem' }}>
                    {message.text}
                </div>
            )}

            <div className="dash-form-card" style={{ marginTop: '1rem' }}>
                <div className="hearings-topbar">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by case number, title, client, or judge"
                    />
                    <button className="outline-btn" onClick={loadCases} disabled={searching}>
                        {searching ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                <div className="hearings-case-grid">
                    <div>
                        <label>Select Case</label>
                        <select value={selectedCaseNumber} onChange={(event) => setSelectedCaseNumber(event.target.value)}>
                            <option value="">Choose a case</option>
                            {caseOptions.map((item) => (
                                <option key={item.caseNumber} value={item.caseNumber}>
                                    {item.caseNumber} · {item.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedCase && (
                        <div className="hearing-case-summary">
                            <div>
                                <div style={{ fontWeight: 800 }}>{selectedCase.caseNumber}</div>
                                <div style={{ color: 'var(--text-gray)' }}>{selectedCase.title}</div>
                            </div>
                            <StatusChip status={selectedCase.status} />
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="dash-form-card"><p>Loading hearings and orders...</p></div>
            ) : selectedCase ? (
                <>
                    <div className="hearings-management-grid">
                        <form className="dash-form-card" onSubmit={handleSubmitHearing}>
                            <h4>Add New Hearing</h4>
                            <div className="input-container">
                                <label>Case Number</label>
                                <input type="text" value={selectedCase.caseNumber} disabled />
                            </div>
                            <div className="input-container">
                                <label>Hearing Date</label>
                                <input
                                    type="date"
                                    value={hearingForm.hearingDate}
                                    onChange={(event) => setHearingForm((current) => ({ ...current, hearingDate: event.target.value }))}
                                    required
                                    disabled={!selectedCase.canManageHearings}
                                />
                            </div>
                            <div className="input-container">
                                <label>Next Hearing Date</label>
                                <input
                                    type="date"
                                    value={hearingForm.nextHearingDate}
                                    onChange={(event) => setHearingForm((current) => ({ ...current, nextHearingDate: event.target.value }))}
                                    disabled={!selectedCase.canManageHearings}
                                />
                            </div>
                            <div className="input-container">
                                <label>Judge</label>
                                {judges.length > 0 ? (
                                    <select
                                        value={hearingForm.judgeName}
                                        onChange={(event) => setHearingForm((current) => ({ ...current, judgeName: event.target.value }))}
                                        disabled={!selectedCase.canManageHearings}
                                    >
                                        <option value="">Select judge</option>
                                        {judges.map((judge) => (
                                            <option key={judge.id} value={judge.username}>{judge.username}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={hearingForm.judgeName}
                                        onChange={(event) => setHearingForm((current) => ({ ...current, judgeName: event.target.value }))}
                                        placeholder="Judge username"
                                        disabled={!selectedCase.canManageHearings}
                                    />
                                )}
                            </div>
                            <div className="input-container">
                                <label>Remarks / Proceedings</label>
                                <textarea
                                    rows="4"
                                    value={hearingForm.remarks}
                                    onChange={(event) => setHearingForm((current) => ({ ...current, remarks: event.target.value }))}
                                    disabled={!selectedCase.canManageHearings}
                                    required
                                />
                            </div>
                            <button className="auth-submit-btn" disabled={submittingHearing || !selectedCase.canManageHearings}>
                                {submittingHearing ? 'Submitting...' : 'Submit Hearing'}
                            </button>
                        </form>

                        <form className="dash-form-card" onSubmit={handleUploadOrder}>
                            <h4>Upload Court Order</h4>
                            <div className="input-container">
                                <label>Case Number</label>
                                <input type="text" value={selectedCase.caseNumber} disabled />
                            </div>
                            <div className="input-container">
                                <label>Order Title</label>
                                <input
                                    type="text"
                                    value={orderForm.title}
                                    onChange={(event) => setOrderForm((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="Interim Order"
                                    disabled={!selectedCase.canManageOrders}
                                />
                            </div>
                            <div className="input-container">
                                <label>Order Type</label>
                                <select
                                    value={orderForm.orderType}
                                    onChange={(event) => setOrderForm((current) => ({ ...current, orderType: event.target.value }))}
                                    disabled={!selectedCase.canManageOrders}
                                >
                                    <option value="Interim Order">Interim Order</option>
                                    <option value="Final Order">Final Order</option>
                                    <option value="Judgment">Judgment</option>
                                    <option value="Notice">Notice</option>
                                </select>
                            </div>
                            <div className="input-container">
                                <label>Order Date</label>
                                <input
                                    type="date"
                                    value={orderForm.orderDate}
                                    onChange={(event) => setOrderForm((current) => ({ ...current, orderDate: event.target.value }))}
                                    disabled={!selectedCase.canManageOrders}
                                />
                            </div>
                            <div className="input-container">
                                <label>Upload PDF</label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(event) => setOrderForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                                    disabled={!selectedCase.canManageOrders}
                                />
                            </div>
                            <button className="auth-submit-btn" disabled={uploadingOrder || !selectedCase.canManageOrders || !orderForm.file}>
                                {uploadingOrder ? 'Uploading...' : 'Upload Order'}
                            </button>
                        </form>
                    </div>

                    <div className="hearings-lists-grid">
                        <div className="dash-form-card">
                            <h4>Hearing History</h4>
                            {hearings.length === 0 ? (
                                <p>No hearings recorded yet.</p>
                            ) : (
                                <div className="public-order-list">
                                    {hearings.map((hearing) => (
                                        <article key={hearing.id} className="public-order-card">
                                            <div>
                                                <h3>{formatDate(hearing.hearingDate)} · {hearing.judgeName}</h3>
                                                <div className="history-subtext">{hearing.remarks}</div>
                                                {hearing.nextHearingDate && (
                                                    <div className="history-subtext">Next date: {formatDate(hearing.nextHearingDate)}</div>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="dash-form-card">
                            <h4>Uploaded Orders</h4>
                            {orders.length === 0 ? (
                                <p>No orders uploaded yet.</p>
                            ) : (
                                <div className="public-order-list">
                                    {orders.map((order) => (
                                        <article key={order.id} className="public-order-card">
                                            <div>
                                                <h3>{order.documentTitle || order.originalFilename}</h3>
                                                <div className="history-subtext">{order.orderType || 'Court Order'} dated {formatDate(order.orderDate)}</div>
                                            </div>
                                            <Link className="outline-btn" to={`/dashboard/case/${selectedCase.caseNumber}`}>
                                                Open Case
                                            </Link>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="dash-form-card"><p>Select a case to manage hearings and orders.</p></div>
            )}
        </motion.div>
    );
}
