import React, { useEffect, useMemo, useState } from 'react'
import {
    assignJudge,
    getAdminUsers,
    getAllCases,
    getCaseAudit,
    getCaseByNumber,
    getCaseDocuments,
    getCaseHearings,
    searchCases,
    updateCaseStatus,
    updateUserRole,
    updateUserStatus,
} from '../services/api'

export default function CaseWorkspacePage({ mode, onNavigate }) {
    if (mode === 'case-details') return <CaseDetails onNavigate={onNavigate} />
    if (mode === 'case-history') return <CaseHistory onNavigate={onNavigate} />
    if (mode === 'user-details') return <UserDetails onNavigate={onNavigate} />
    return <CaseSearch onNavigate={onNavigate} />
}

function CaseSearch({ onNavigate }) {
    const [query, setQuery] = useState('')
    const [status, setStatus] = useState('')
    const [court, setCourt] = useState('')
    const [cases, setCases] = useState([])
    const [total, setTotal] = useState(0)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await searchCases({ scope: localStorage.getItem('role') === 'ADMIN' ? 'all' : 'my', query, status })
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
        <RecordsShell active="Case Search" onNavigate={onNavigate}>
            <TopStrip title="Judicial Case Portal" />
            <main className="records-main search-page">
                <div className="search-heading">
                    <div>
                        <h1>Case Records Search</h1>
                        <p>Access and manage judicial proceedings across all divisions.</p>
                    </div>
                    <div className="view-toggle"><button className="active">▤ Table</button><button>▦ Cards</button></div>
                </div>
                <section className="search-filter-card">
                    <div className="primary-search">
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Case Number, Title, or Party Names..." />
                        <button type="button" onClick={load}>Search Records</button>
                    </div>
                    <div className="filter-grid">
                        <label>Case Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option><option value="FILED">Filed</option><option value="HEARING">Hearing</option><option value="CLOSED">Closed</option></select></label>
                        <label>Court Name<input value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Supreme Division" /></label>
                        <label>Date Range (From - To)<input type="date" /></label>
                        <label>Judicial Officer<input placeholder="Judge or Lawyer Name" /></label>
                    </div>
                    <div className="filter-chips"><span>Status: {status || 'Any'} ×</span><span>Year: {new Date().getFullYear()} ×</span><button onClick={() => { setQuery(''); setStatus(''); setCourt('') }}>Clear All Filters</button></div>
                </section>
                <section className="results-card">
                    <div className="results-head"><h2>Search Results <span>({total || cases.length} cases found)</span></h2><div><button>Sort: Newest First</button><button>Export CSV</button></div></div>
                    <table>
                        <thead><tr><th>Case Number</th><th>Case Title / Parties</th><th>Status</th><th>Last Update</th><th>Next Hearing</th><th>Actions</th></tr></thead>
                        <tbody>
                            {cases.map((item) => <tr key={item.caseNumber}><td>{item.caseNumber}</td><td><strong>{item.title}</strong><small>{item.courtName || 'Court registry'}</small></td><td><Status value={item.status} /></td><td>{formatDate(item.updatedAt || item.filedDate)}</td><td>{nextHearing(item)}</td><td><button onClick={() => openCase(item.caseNumber)}>Open</button></td></tr>)}
                            {!cases.length && <tr><td colSpan="6">{loading ? 'Searching...' : 'No cases found.'}</td></tr>}
                        </tbody>
                    </table>
                    {error && <p className="records-error">{error}</p>}
                </section>
                <div className="search-bottom"><div><h2>Need Assistance?</h2><p>Contact the Registry Helpdesk for technical support with e-filing and case tracking.</p><button>Contact Registry</button></div><article><span /> <div><b>Platform Update</b><h2>Integrated E-Service Launched</h2><p>You can now serve notices electronically to verified legal practitioners directly from the case details view.</p></div></article></div>
            </main>
        </RecordsShell>
    )
}

function CaseDetails({ onNavigate }) {
    const [data, setData] = useState(null)
    const [docs, setDocs] = useState([])
    const [hearings, setHearings] = useState([])
    const [audit, setAudit] = useState([])
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const caseNumber = localStorage.getItem('selectedCaseNumber')

    useEffect(() => {
        async function load() {
            try {
                let selected = caseNumber
                if (!selected) {
                    const all = await getAllCases()
                    selected = all[0]?.caseNumber
                    if (selected) localStorage.setItem('selectedCaseNumber', selected)
                }
                if (!selected) throw new Error('No case selected.')
                const [caseData, docData, hearingData, auditData] = await Promise.all([
                    getCaseByNumber(selected),
                    getCaseDocuments(selected).catch(() => []),
                    getCaseHearings(selected).catch(() => []),
                    getCaseAudit(selected).catch(() => []),
                ])
                setData(caseData); setDocs(docData); setHearings(hearingData); setAudit(auditData)
            } catch (err) {
                setError(err.message || 'Unable to load case details.')
            }
        }
        load()
    }, [])

    const changeStatus = async () => {
        const next = data?.allowedNextStatuses?.[0] || 'SCRUTINY'
        try {
            const res = await updateCaseStatus(data.caseNumber, next)
            setMessage(res.message || `Status updated to ${next}.`)
            setData(await getCaseByNumber(data.caseNumber))
        } catch (err) { setError(err.message) }
    }

    const assign = async () => {
        try {
            const res = await assignJudge(data.caseNumber, 'judgedemo')
            setMessage(res.message || 'Judge assigned.')
            setData(await getCaseByNumber(data.caseNumber))
        } catch (err) { setError(err.message) }
    }

    if (error && !data) return <RecordsShell active="Case Records" onNavigate={onNavigate}><main className="records-main"><p className="records-error">{error}</p></main></RecordsShell>
    if (!data) return <RecordsShell active="Case Records" onNavigate={onNavigate}><main className="records-main"><p>Loading case details...</p></main></RecordsShell>

    const latestHearing = hearings[0]
    return (
        <RecordsShell active="Case Records" onNavigate={onNavigate}>
            <TopStrip title="HIGH COURT" />
            <main className="records-main details-page">
                <section className="case-hero-card">
                    <div><span className="case-number">{data.caseNumber}</span><Status value={data.status} /></div>
                    <h1>{data.title}</h1>
                    <p>▦ {data.courtName || 'High Court'} &nbsp;&nbsp; ▣ Filing Date: {formatDate(data.filedDate)} &nbsp;&nbsp; ⌁ {data.caseTypeCode || 'Corporate Dispute'}</p>
                    <button onClick={changeStatus}>Update Status</button><button onClick={assign} className="outline">Add Hearing</button><button onClick={() => onNavigate('file-case')} className="orange">Upload Order</button>
                    {(message || error) && <p className={error ? 'records-error' : 'records-success'}>{error || message}</p>}
                </section>
                <section className="case-detail-grid">
                    <div className="case-tabs">
                        <nav><button className="active">Basic Information</button><button>Documents</button><button>Hearings</button><button onClick={() => onNavigate('case-history')}>Audit Trail</button></nav>
                        <div className="party-cards"><article><small>Petitioner</small><strong>{data.clientUsername || 'Primary Plaintiff'}</strong><span>Primary Plaintiff</span></article><article><small>Respondent</small><strong>{opponentFromTitle(data.title)}</strong><span>Respondent</span></article></div>
                        <h2>Case Description</h2><p className="case-desc">{data.description}</p>
                        <h2>Case Timeline</h2><Timeline items={audit.length ? audit : [{ eventType: 'CASE_CREATED', details: 'Case Filed & Registered', occurredAt: data.createdAt }]} />
                    </div>
                    <aside>
                        <Panel title="Judicial Assignment"><p><b>Assigned Judge</b><br />{data.judgeUsername || 'Not assigned'}</p><p><b>Assigned Lawyer</b><br />{data.lawyerUsername || 'Not assigned'}</p></Panel>
                        <section className="next-hearing"><h2>Next Hearing</h2><strong>{latestHearing?.nextHearingDate || latestHearing?.hearingDate || 'Not scheduled'}</strong><span>{latestHearing?.remarks || 'Registry update pending'}</span><button>View Calendar</button></section>
                        <Panel title="Tags & Metadata"><span className="meta-tag">High Stakes</span><span className="meta-tag">{data.status}</span><span className="meta-tag">New Filing</span></Panel>
                    </aside>
                </section>
                <div className="detail-bottom"><Evidence docs={docs} /><AuditSummary audit={audit} onNavigate={onNavigate} /></div>
            </main>
        </RecordsShell>
    )
}

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
        <RecordsShell active="Case History" onNavigate={onNavigate}>
            <TopStrip title="HIGH COURT" />
            <main className="records-main history-page">
                <section className="case-hero-card"><span className="case-number">{caseNumber || 'No Case'}</span><h1>Case History & Audit Trail</h1><p>{caseData?.title || 'Immutable registry events for the selected case.'}</p></section>
                <section className="history-card"><h2>Chronological Events</h2>{error && <p className="records-error">{error}</p>}<Timeline items={audit} large /></section>
            </main>
        </RecordsShell>
    )
}

function UserDetails({ onNavigate }) {
    const [users, setUsers] = useState([])
    const [selectedId, setSelectedId] = useState(localStorage.getItem('selectedUserId') || '')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    useEffect(() => { getAdminUsers().then((d) => { setUsers(d.content || []); if (!selectedId && d.content?.[0]) setSelectedId(String(d.content[0].id)) }).catch((e) => setError(e.message)) }, [])
    const user = users.find((item) => String(item.id) === String(selectedId)) || users[0]
    const save = async () => {
        try {
            if (!user) return
            const role = document.getElementById('user-role-select')?.value || user.role
            const active = document.getElementById('user-active-toggle')?.checked ?? user.active
            await updateUserRole(user.id, role)
            await updateUserStatus(user.id, active)
            setMessage('User permissions saved.')
            const refreshed = await getAdminUsers()
            setUsers(refreshed.content || [])
        } catch (err) { setError(err.message) }
    }
    return (
        <RecordsShell active="User Management" onNavigate={onNavigate}>
            <TopStrip title="Court Admin Portal" />
            <main className="records-main user-page">
                <div className="user-title"><div><p>User Management › <b>User Details</b></p><h1>{user?.username || 'User Details'}</h1><span>{user?.role || 'Role'} · Registry Office</span></div><div><button>Print Summary</button><button onClick={save}>Save Changes</button></div></div>
                {(message || error) && <p className={error ? 'records-error' : 'records-success'}>{error || message}</p>}
                <div className="user-detail-grid">
                    <aside>
                        <section className="profile-card"><div className="big-avatar">⚖</div><h2>{displayName(user?.username || '')}</h2><p>UID: #JS-{user?.id || '000'}-AD</p><hr /><small>Username</small><strong>{user?.username}</strong><small>Email Address</small><strong>{user?.email}</strong><small>Contact Number</small><strong>+91 9820-1122-33</strong></section>
                        <section className="audit-summary-card"><h3>Audit Log Summary</h3><p><span>Account Created</span><b>{formatDate(user?.createdAt)}</b></p><p><span>Last Modified</span><b>Today</b></p><p><span>Last Login</span><b>2 hours ago</b></p></section>
                    </aside>
                    <section className="admin-controls-card"><h2>Administrative Controls</h2><div className="control-grid"><label>Assigned Role<select id="user-role-select" defaultValue={user?.role}><option>CLIENT</option><option>LAWYER</option><option>JUDGE</option><option>ADMIN</option></select></label><label>Account Status<span className="toggle-row"><input id="user-active-toggle" type="checkbox" defaultChecked={user?.active} /> <b>Active</b></span></label></div><div className="jurisdiction-box"><h3>Assigned Jurisdictions</h3><span>District Court Mumbai ×</span><span>High Court Appellate ×</span><button>+ Add Jurisdiction</button></div></section>
                    <section className="security-actions"><h2>Security Actions <span>Critical</span></h2><p>Perform high-privilege operations on this account.</p><div><button>Reset Password</button><button>Rotate API Keys</button><button>Terminate Sessions</button><button className="danger" onClick={() => updateUserStatus(user.id, false).then(() => setMessage('Account deactivated.')).catch((e) => setError(e.message))}>Deactivate Account</button></div></section>
                    <section className="admin-notes"><h3>Administrative Notes</h3><textarea placeholder="Enter administrative notes for audit history..." /><p>Notes are visible to all system administrators and recorded in the permanent audit log.</p></section>
                </div>
            </main>
        </RecordsShell>
    )
}

function RecordsShell({ active, children, onNavigate }) {
    const items = ['Dashboard', 'Case Search', 'Case Records', 'Case History', 'User Management', 'Filing Center', 'Hearing Calendar', 'Document Vault']
    return <div className="records-app"><aside className="records-sidebar"><div className="records-brand"><span>⌁</span><strong>HIGH COURT<small>Judicial Portal</small></strong></div><nav>{items.map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => routeFor(item, onNavigate)}><span>{item === 'User Management' ? '♙' : item.includes('Case') ? '⌁' : '▦'}</span>{item}</button>)}</nav><button className="new-case-btn" onClick={() => onNavigate('file-case')}>＋ New Case Filing</button></aside>{children}</div>
}

function TopStrip({ title }) {
    return <header className="records-top"><strong>{title}</strong><label><span>⌕</span><input placeholder="Search Case Number, Petitioner..." /></label><div><b>EN | HI</b><span>♧</span><span>?</span><span>👩🏻</span></div></header>
}

function routeFor(item, onNavigate) {
    if (item === 'Case Search') onNavigate('case-search')
    else if (item === 'Case Records') onNavigate('case-details')
    else if (item === 'Case History') onNavigate('case-history')
    else if (item === 'User Management') onNavigate('user-details')
    else if (item === 'Dashboard') onNavigate(localStorage.getItem('role') === 'ADMIN' ? 'admin' : 'dashboard')
}

function Status({ value }) { return <span className={`status-pill ${String(value).toLowerCase()}`}>• {String(value || 'ACTIVE').replaceAll('_', ' ')}</span> }
function Panel({ title, children }) { return <section className="side-panel"><h2>{title}</h2>{children}</section> }
function Timeline({ items, large }) { return <div className={large ? 'timeline large' : 'timeline'}>{items.map((item) => <article key={item.id || item.occurredAt}><span>⚑</span><div><time>{formatDate(item.occurredAt)}</time><strong>{item.details || item.eventType}</strong><small>{item.actorUsername || item.eventType}</small></div></article>)}</div> }
function Evidence({ docs }) { return <section className="records-mini-card"><h2>Recent Evidence <button>View All</button></h2>{docs.slice(0, 3).map((doc) => <p key={doc.id}>▤ <b>{doc.originalFilename}</b><span>Uploaded on {formatDate(doc.uploadedAt)}</span></p>)}{!docs.length && <p>No documents uploaded yet.</p>}</section> }
function AuditSummary({ audit, onNavigate }) { return <section className="records-mini-card"><h2>Audit Log <button onClick={() => onNavigate('case-history')}>Full Audit</button></h2>{audit.slice(0, 3).map((event) => <p key={event.id}>• <b>{event.details}</b><span>{formatDate(event.occurredAt)}</span></p>)}</section> }

function opponentFromTitle(title) { return title?.split(/\s+vs\.?\s+/i)[1] || 'Respondent' }
function nextHearing(item) { return item.hearings?.[0]?.nextHearingDate || item.hearings?.[0]?.hearingDate || 'Not Scheduled' }
function formatDate(value) { if (!value) return 'N/A'; return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }) }
function displayName(value) { return String(value || '').replace(/demo$/i, '').replace(/[._-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) }
