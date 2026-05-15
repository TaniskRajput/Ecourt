import React, { useEffect, useState } from 'react'
import {
    assignJudge,
    getAdminUsers,
    getAllCases,
    getCaseAudit,
    getCaseByNumber,
    getCaseDocuments,
    getCaseHearings,
    getCaseOrders,
    searchCases,
    updateCaseStatus,
    updateUserRole,
    updateUserStatus,
    getMyCases,
    addHearing,
    getDocumentDownloadUrl,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../services/api'
import DashboardLayout from '../components/DashboardLayout'

export default function CaseWorkspacePage({ mode, onNavigate }) {
    if (mode === 'case-details') return <CaseDetails onNavigate={onNavigate} />
    if (mode === 'case-history') return <CaseHistory onNavigate={onNavigate} />
    if (mode === 'user-details') return <UserDetails onNavigate={onNavigate} />
    if (mode === 'notifications') return <NotificationsPage onNavigate={onNavigate} />
    return <CaseSearch onNavigate={onNavigate} />
}

// ── Case Search ─────────────────────────────────────────────────────────

function CaseSearch({ onNavigate }) {
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState('')
    const [cases, setCases] = useState([])
    const [total, setTotal] = useState(0)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const role = localStorage.getItem('role')
            const scope = (role === 'ADMIN' || role === 'JUDGE') ? 'all' : 'my'
            const params = { scope }
            if (query) params.query = query
            if (status) params.status = status
            const data = await searchCases(params)
            setCases(data.content || [])
            setTotal(data.totalElements || 0)
        } catch (err) {
            setError(err.message || 'Unable to search cases.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const openCase = (caseNumber) => {
        localStorage.setItem('selectedCaseNumber', caseNumber)
        onNavigate('case-details')
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Case Search">
            <main className="records-main search-page">
                <div className="search-heading">
                    <div>
                        <h1>Case Records Search</h1>
                        <p>Access and manage judicial proceedings.</p>
                    </div>
                </div>
                <section className="search-filter-card">
                    <div className="primary-search">
                        <input 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)} 
                            placeholder="Search by Case Number, Title, or Party Names..." 
                            onKeyDown={(e) => e.key === 'Enter' && load()}
                        />
                        <button type="button" onClick={load}>Search Records</button>
                    </div>
                    <div className="filter-grid">
                        <label>Case Status
                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="">All Statuses</option>
                                <option value="FILED">Filed</option>
                                <option value="SCRUTINY">Scrutiny</option>
                                <option value="HEARING">Hearing</option>
                                <option value="CLOSED">Closed</option>
                            </select>
                        </label>
                    </div>
                    <div className="filter-chips">
                        {status && <span>Status: {status} <button onClick={() => setStatus('')}>×</button></span>}
                        {query && <span>Query: {query} <button onClick={() => setQuery('')}>×</button></span>}
                        <button onClick={() => { setQuery(''); setStatus(''); }}>Clear All Filters</button>
                    </div>
                </section>
                <section className="results-card">
                    <div className="results-head">
                        <h2>Search Results <span>({total || cases.length} cases found)</span></h2>
                    </div>
                    <table>
                        <thead><tr><th>Case Number</th><th>Case Title</th><th>Status</th><th>Filed Date</th><th>Actions</th></tr></thead>
                        <tbody>
                            {cases.map((item) => (
                                <tr key={item.caseNumber}>
                                    <td>{item.caseNumber}</td>
                                    <td><strong>{item.title}</strong><br/><small>{item.courtName || ''}</small></td>
                                    <td><Status value={item.status} /></td>
                                    <td>{formatDate(item.filedDate)}</td>
                                    <td><button onClick={() => openCase(item.caseNumber)}>Open</button></td>
                                </tr>
                            ))}
                            {!cases.length && <tr><td colSpan="5">{loading ? 'Searching...' : 'No cases found.'}</td></tr>}
                        </tbody>
                    </table>
                    {error && <p className="records-error">{error}</p>}
                </section>
            </main>
        </DashboardLayout>
    )
}

// ── Case Details ────────────────────────────────────────────────────────

function CaseDetails({ onNavigate }) {
    const [data, setData] = useState(null)
    const [docs, setDocs] = useState([])
    const [hearings, setHearings] = useState([])
    const [orders, setOrders] = useState([])
    const [audit, setAudit] = useState([])
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const caseNumber = localStorage.getItem('selectedCaseNumber')

    useEffect(() => {
        async function load() {
            try {
                let selected = caseNumber
                if (!selected) {
                    const isAdmin = localStorage.getItem('role') === 'ADMIN'
                    const all = isAdmin ? await getAllCases() : await getMyCases()
                    selected = all[0]?.caseNumber
                    if (selected) localStorage.setItem('selectedCaseNumber', selected)
                }
                if (!selected) throw new Error('No case selected.')
                const [caseData, docData, hearingData, orderData, auditData] = await Promise.all([
                    getCaseByNumber(selected),
                    getCaseDocuments(selected).catch(() => []),
                    getCaseHearings(selected).catch(() => []),
                    getCaseOrders(selected).catch(() => []),
                    getCaseAudit(selected).catch(() => []),
                ])
                setData(caseData)
                setDocs(docData)
                setHearings(hearingData)
                setOrders(orderData)
                setAudit(auditData)
            } catch (err) {
                setError(err.message || 'Unable to load case details.')
            }
        }
        load()
    }, [])

    const changeStatus = async (nextStatus) => {
        try {
            const res = await updateCaseStatus(data.caseNumber, nextStatus)
            setMessage(res.message || `Status updated to ${nextStatus}.`)
            setError('')
            setData(await getCaseByNumber(data.caseNumber))
        } catch (err) { setError(err.message); setMessage('') }
    }

    const doAssignJudge = async () => {
        const judge = prompt('Enter judge username to assign:')
        if (!judge) return
        try {
            const res = await assignJudge(data.caseNumber, judge)
            setMessage(res.message || 'Judge assigned.')
            setError('')
            setData(await getCaseByNumber(data.caseNumber))
        } catch (err) { setError(err.message); setMessage('') }
    }

    const doAddHearing = async () => {
        const dateStr = prompt('Enter hearing date (YYYY-MM-DD):')
        if (!dateStr) return
        const remarks = prompt('Enter hearing remarks:')
        if (!remarks) return
        const nextDateStr = prompt('Enter next hearing date (YYYY-MM-DD) or leave empty:')
        try {
            const payload = { hearingDate: dateStr, remarks }
            if (nextDateStr) payload.nextHearingDate = nextDateStr
            await addHearing(data.caseNumber, payload)
            setMessage('Hearing added successfully.')
            setError('')
            setHearings(await getCaseHearings(data.caseNumber))
            setData(await getCaseByNumber(data.caseNumber))
        } catch (err) { setError(err.message); setMessage('') }
    }

    if (error && !data) return <DashboardLayout onNavigate={onNavigate} activeItem="Case Search"><main className="records-main"><p className="records-error">{error}</p></main></DashboardLayout>
    if (!data) return <DashboardLayout onNavigate={onNavigate} activeItem="Case Search"><main className="records-main"><p>Loading case details...</p></main></DashboardLayout>

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Case Search">
            <main className="records-main details-page">
                <section className="case-hero-card">
                    <div><span className="case-number">{data.caseNumber}</span><Status value={data.status} /></div>
                    <h1>{data.title}</h1>
                    <p>▦ {data.courtName || 'High Court'} &nbsp;&nbsp; Filed: {formatDate(data.filedDate)}</p>
                    
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                        {data.canUpdateStatus && data.allowedNextStatuses?.length > 0 && (
                            data.allowedNextStatuses.map(s => (
                                <button key={s} onClick={() => changeStatus(s)}>Move to {s}</button>
                            ))
                        )}
                        {data.canAssignJudge && <button onClick={doAssignJudge} className="outline">Assign Judge</button>}
                        {data.canManageHearings && <button onClick={doAddHearing} className="outline">Add Hearing</button>}
                    </div>

                    {(message || error) && <p className={error ? 'records-error' : 'records-success'}>{error || message}</p>}
                </section>

                <section className="case-detail-grid">
                    <div className="case-tabs">
                        {/* Basic Info */}
                        <h2>Case Information</h2>
                        <div className="party-cards">
                            <article><small>Petitioner / Client</small><strong>{data.clientUsername || 'N/A'}</strong></article>
                            <article><small>Lawyer</small><strong>{data.lawyerUsername || 'Not assigned'}</strong></article>
                            <article><small>Judge</small><strong>{data.judgeUsername || 'Not assigned'}</strong></article>
                        </div>
                        {data.description && <><h2>Description</h2><p className="case-desc">{data.description}</p></>}

                        {/* Hearings */}
                        {hearings.length > 0 && (
                            <>
                                <h2>Hearings ({hearings.length})</h2>
                                {hearings.map((h, i) => (
                                    <div key={h.id || i} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
                                        <strong>{h.hearingDate}</strong>
                                        {h.nextHearingDate && <span style={{ color: '#0b2fbb', marginLeft: 12 }}>Next: {h.nextHearingDate}</span>}
                                        <p style={{ margin: '4px 0 0', color: '#52617a' }}>{h.remarks}</p>
                                        {h.judgeName && <small>Judge: {h.judgeName}</small>}
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Orders */}
                        {orders.length > 0 && (
                            <>
                                <h2>Court Orders ({orders.length})</h2>
                                {orders.map((o) => (
                                    <div key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{o.originalFilename || o.title || 'Order'}</strong>
                                            <small style={{ display: 'block', color: '#52617a' }}>{o.orderType} · {formatDate(o.uploadedAt)}</small>
                                        </div>
                                        <a href={getDocumentDownloadUrl(data.caseNumber, o.id)} target="_blank" rel="noopener noreferrer">Download</a>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Audit Trail */}
                        <h2>Audit Trail</h2>
                        <button onClick={() => onNavigate('case-history')} style={{ marginBottom: 12 }}>View Full Audit →</button>
                        {audit.slice(0, 3).map((event) => (
                            <div key={event.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                <strong>{event.details || event.eventType}</strong>
                                <small style={{ display: 'block', color: '#52617a' }}>{formatDate(event.occurredAt)} · {event.actorUsername || ''}</small>
                            </div>
                        ))}
                    </div>

                    <aside>
                        {/* Documents */}
                        <section className="side-panel">
                            <h2>Documents ({docs.length})</h2>
                            {docs.map((doc) => (
                                <div key={doc.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                    <a href={getDocumentDownloadUrl(data.caseNumber, doc.id)} target="_blank" rel="noopener noreferrer">
                                        {doc.originalFilename}
                                    </a>
                                    <small style={{ display: 'block', color: '#52617a' }}>Uploaded {formatDate(doc.uploadedAt)}</small>
                                </div>
                            ))}
                            {docs.length === 0 && <p style={{ color: '#64748b' }}>No documents uploaded.</p>}
                        </section>

                        {/* Case Insight (from backend) */}
                        {data.insight && (
                            <section className="side-panel">
                                <h2>AI Insight</h2>
                                {data.insight.predictedNextHearingDate && <p><strong>Next Hearing:</strong> {data.insight.predictedNextHearingDate} ({data.insight.predictedNextHearingInDays}d)</p>}
                                {data.insight.estimatedDisposalDate && <p><strong>Est. Disposal:</strong> {data.insight.estimatedDisposalDate} ({data.insight.estimatedDisposalInDays}d)</p>}
                                <p><strong>Confidence:</strong> {data.insight.confidenceLabel} ({data.insight.confidenceScore}%)</p>
                                {data.insight.summary && <p>{data.insight.summary}</p>}
                            </section>
                        )}

                        {/* Tags */}
                        <section className="side-panel">
                            <h2>Status</h2>
                            <span className="meta-tag">{data.status}</span>
                            {data.courtName && <span className="meta-tag">{data.courtName}</span>}
                        </section>
                    </aside>
                </section>
            </main>
        </DashboardLayout>
    )
}

// ── Case History ────────────────────────────────────────────────────────

function CaseHistory({ onNavigate }) {
    const [audit, setAudit] = useState([])
    const [caseData, setCaseData] = useState(null)
    const [error, setError] = useState('')
    const caseNumber = localStorage.getItem('selectedCaseNumber')

    useEffect(() => {
        async function load() {
            try {
                if (!caseNumber) throw new Error('Select a case first.')
                const [c, a] = await Promise.all([getCaseByNumber(caseNumber), getCaseAudit(caseNumber)])
                setCaseData(c); setAudit(a)
            } catch (err) { setError(err.message) }
        }
        load()
    }, [])

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Case Search">
            <main className="records-main history-page">
                <section className="case-hero-card">
                    <span className="case-number">{caseNumber || 'No Case'}</span>
                    <h1>Case History & Audit Trail</h1>
                    <p>{caseData?.title || 'Immutable registry events for the selected case.'}</p>
                </section>
                <section className="history-card">
                    <h2>Chronological Events</h2>
                    {error && <p className="records-error">{error}</p>}
                    {audit.map((item) => (
                        <article key={item.id || item.occurredAt} style={{ padding: '12px 0', borderBottom: '1px solid #eee' }}>
                            <time style={{ color: '#0b2fbb', fontWeight: 600 }}>{formatDate(item.occurredAt)}</time>
                            <strong style={{ display: 'block' }}>{item.details || item.eventType}</strong>
                            <small style={{ color: '#52617a' }}>{item.actorUsername || item.eventType}</small>
                        </article>
                    ))}
                    {audit.length === 0 && !error && <p style={{ color: '#64748b' }}>No audit events found.</p>}
                </section>
            </main>
        </DashboardLayout>
    )
}

// ── User Details (Admin Only) ───────────────────────────────────────────

function UserDetails({ onNavigate }) {
    const [users, setUsers] = useState([])
    const [selectedId, setSelectedId] = useState(localStorage.getItem('selectedUserId') || '')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        getAdminUsers()
            .then((d) => {
                setUsers(d.content || [])
                if (!selectedId && d.content?.[0]) setSelectedId(String(d.content[0].id))
            })
            .catch((e) => setError(e.message))
    }, [])

    const user = users.find((item) => String(item.id) === String(selectedId)) || users[0]

    const saveRole = async (newRole) => {
        try {
            await updateUserRole(user.id, newRole)
            setMessage('Role updated.')
            setError('')
            const refreshed = await getAdminUsers()
            setUsers(refreshed.content || [])
        } catch (err) { setError(err.message); setMessage('') }
    }

    const toggleStatus = async (active) => {
        try {
            await updateUserStatus(user.id, active)
            setMessage(`Account ${active ? 'activated' : 'deactivated'}.`)
            setError('')
            const refreshed = await getAdminUsers()
            setUsers(refreshed.content || [])
        } catch (err) { setError(err.message); setMessage('') }
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="User Management">
            <main className="records-main user-page">
                <div className="user-title">
                    <div>
                        <p>User Management › <b>User Details</b></p>
                        <h1>{user?.username || 'User Details'}</h1>
                        <span>{user?.role || 'Role'} · {user?.active ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
                {(message || error) && <p className={error ? 'records-error' : 'records-success'}>{error || message}</p>}
                
                <div className="user-detail-grid">
                    <aside>
                        {/* User List */}
                        <section className="profile-card">
                            <h2>All Users ({users.length})</h2>
                            {users.map((u) => (
                                <div 
                                    key={u.id} 
                                    onClick={() => setSelectedId(String(u.id))}
                                    style={{ 
                                        padding: '10px', 
                                        cursor: 'pointer', 
                                        borderBottom: '1px solid #eee',
                                        background: String(u.id) === String(selectedId) ? '#eff6ff' : 'transparent'
                                    }}
                                >
                                    <strong>{u.username}</strong>
                                    <small style={{ display: 'block', color: '#52617a' }}>{u.role} · {u.active ? 'Active' : 'Inactive'}</small>
                                </div>
                            ))}
                        </section>
                    </aside>

                    {user && (
                        <section className="admin-controls-card">
                            <h2>User: {user.username}</h2>
                            <div className="control-grid">
                                <div style={{ marginBottom: 16 }}>
                                    <strong>Email:</strong> {user.email}
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <strong>Created:</strong> {formatDate(user.createdAt)}
                                </div>
                                <label>Role
                                    <select 
                                        value={user.role} 
                                        onChange={(e) => saveRole(e.target.value)}
                                    >
                                        <option>CLIENT</option>
                                        <option>LAWYER</option>
                                        <option>JUDGE</option>
                                        <option>ADMIN</option>
                                    </select>
                                </label>
                                <label>Account Status
                                    <div style={{ marginTop: 8 }}>
                                        <button 
                                            onClick={() => toggleStatus(!user.active)}
                                            style={{ 
                                                background: user.active ? '#dc2626' : '#16a34a', 
                                                color: '#fff', 
                                                border: 0, 
                                                padding: '8px 16px', 
                                                borderRadius: 6,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {user.active ? 'Deactivate Account' : 'Activate Account'}
                                        </button>
                                    </div>
                                </label>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </DashboardLayout>
    )
}

// ── Shared Helpers ──────────────────────────────────────────────────────

function Status({ value }) {
    return <span className={`status-pill ${String(value).toLowerCase()}`}>• {String(value || 'ACTIVE').replaceAll('_', ' ')}</span>
}

function formatDate(value) {
    if (!value) return 'N/A'
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatDateTime(value) {
    if (!value) return 'Recently'
    return new Date(value).toLocaleString('en-IN', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Notifications Page ──────────────────────────────────────────────────

function NotificationsPage({ onNavigate }) {
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = async () => {
        setLoading(true)
        try {
            const data = await getNotifications()
            setNotifications(data.notifications || [])
            setUnreadCount(data.unreadCount || 0)
        } catch (err) {
            setError(err.message || 'Unable to load notifications.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const markRead = async (id) => {
        try {
            await markNotificationRead(id)
            await load()
        } catch (err) { setError(err.message) }
    }

    const markAll = async () => {
        try {
            await markAllNotificationsRead()
            await load()
        } catch (err) { setError(err.message) }
    }

    const openCase = (caseNumber) => {
        if (caseNumber) {
            localStorage.setItem('selectedCaseNumber', caseNumber)
            onNavigate('case-details')
        }
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Notifications">
            <main className="records-main">
                <div className="notif-header">
                    <div>
                        <h1>Notifications</h1>
                        <p>{unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}</p>
                    </div>
                    {unreadCount > 0 && <button className="notif-mark-all" onClick={markAll}>Mark All Read</button>}
                </div>

                {loading && <p style={{ padding: 24 }}>Loading notifications...</p>}
                {error && <p className="records-error">{error}</p>}

                <div className="notif-list">
                    {notifications.map((n) => (
                        <article
                            key={n.id}
                            className={`notif-item ${n.read ? 'read' : 'unread'}`}
                            onClick={() => openCase(n.caseNumber)}
                        >
                            <div className="notif-dot">{n.read ? '' : '●'}</div>
                            <div className="notif-body">
                                <strong>{n.title}</strong>
                                <p>{n.message}</p>
                                <small>
                                    {n.eventType} · {formatDateTime(n.createdAt)}
                                    {n.caseNumber && <span> · Case: {n.caseNumber}</span>}
                                </small>
                            </div>
                            {!n.read && (
                                <button
                                    className="notif-read-btn"
                                    onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                                >Mark Read</button>
                            )}
                        </article>
                    ))}
                    {notifications.length === 0 && !loading && (
                        <div className="notif-empty">
                            <span>🔔</span>
                            <p>No notifications yet. Actions on your cases will appear here.</p>
                        </div>
                    )}
                </div>
            </main>
        </DashboardLayout>
    )
}

