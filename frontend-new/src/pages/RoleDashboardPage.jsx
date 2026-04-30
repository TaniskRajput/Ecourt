import React, { useEffect, useMemo, useState } from 'react'
import { getDashboardSummary, getMyCases, getNotifications } from '../services/api'

export default function RoleDashboardPage({ onNavigate }) {
    const [summary, setSummary] = useState(null)
    const [cases, setCases] = useState([])
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const role = localStorage.getItem('role') || 'CLIENT'
    const username = localStorage.getItem('username') || 'Rajesh Kumar'

    useEffect(() => {
        let mounted = true

        async function loadDashboard() {
            setLoading(true)
            setError('')
            try {
                const [summaryData, caseData, notificationData] = await Promise.all([
                    getDashboardSummary(),
                    getMyCases(),
                    getNotifications().catch(() => ({ notifications: [] })),
                ])
                if (!mounted) return
                setSummary(summaryData)
                setCases(Array.isArray(caseData) ? caseData : [])
                setNotifications(notificationData.notifications || [])
            } catch (err) {
                if (!mounted) return
                setError(err.message || 'Unable to load dashboard. Please sign in again.')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadDashboard()
        return () => {
            mounted = false
        }
    }, [])

    const logout = () => {
        localStorage.clear()
        onNavigate('login')
    }

    if (role === 'JUDGE') {
        return <JudgeDashboard cases={cases} error={error} loading={loading} notifications={notifications} onLogout={logout} onNavigate={onNavigate} summary={summary} username={username} />
    }

    if (role === 'LAWYER') {
        return <LawyerDashboard cases={cases} error={error} loading={loading} notifications={notifications} onLogout={logout} onNavigate={onNavigate} summary={summary} username={username} />
    }

    return <ClientDashboard cases={cases} error={error} loading={loading} notifications={notifications} onLogout={logout} onNavigate={onNavigate} summary={summary} username={username} />
}

function ClientDashboard({ cases, error, loading, notifications, onLogout, onNavigate, summary, username }) {
    const active = summary?.activeCases ?? cases.filter((item) => item.status !== 'CLOSED').length
    const closed = summary?.closedCases ?? cases.filter((item) => item.status === 'CLOSED').length
    const pending = cases.filter((item) => ['FILED', 'SCRUTINY', 'HEARING'].includes(item.status)).length

    return (
        <PortalShell mode="client" onLogout={onLogout} onNavigate={onNavigate} portalLabel="LAWYER PORTAL">
            <TopNav onNavigate={onNavigate} />
            <main className="role-main client-main">
                <Hero title={`Welcome, ${displayName(username)}`} text="Monitor your active litigation proceedings and manage electronic filings through the centralized dashboard." />
                <RoleState error={error} loading={loading} />
                {!loading && !error && (
                    <>
                        <div className="role-metrics">
                            <RoleMetric label="Total Cases" value={summary?.totalCases ?? cases.length} icon="□" />
                            <RoleMetric label="Active" value={active} icon="⌁" blue />
                            <RoleMetric label="Closed" value={closed} icon="✓" green />
                            <RoleMetric label="Pending Hearings" value={pending} icon="↪" amber />
                        </div>
                        <div className="client-grid">
                            <CaseTable title="Recent Cases" cases={cases} columns={['caseNumber', 'title', 'status', 'filedDate']} />
                            <ActivityPanel notifications={notifications} />
                            <HelpPanel />
                        </div>
                    </>
                )}
            </main>
            <RoleFooter />
        </PortalShell>
    )
}

function LawyerDashboard({ cases, error, loading, notifications, onLogout, onNavigate, summary, username }) {
    const active = cases.filter((item) => item.status !== 'CLOSED').length
    const closed = cases.filter((item) => item.status === 'CLOSED').length
    const clients = new Set(cases.map((item) => item.clientUsername).filter(Boolean)).size

    return (
        <PortalShell mode="lawyer" onLogout={onLogout} onNavigate={onNavigate} profile={`Adv. ${displayName(username)}`}>
            <LawyerTopbar />
            <main className="role-main lawyer-main">
                <Hero title={`Welcome back, Adv. ${displayName(username)}`} text={`You have ${summary?.pendingActions ?? 0} actions pending this week. Stay updated with your case filings and orders.`} />
                <RoleState error={error} loading={loading} />
                {!loading && !error && (
                    <>
                        <div className="role-metrics">
                            <RoleMetric label="Total Assigned Cases" value={cases.length} icon="□" />
                            <StatusMix active={active} closed={closed} pending={Math.max(cases.length - active - closed, 0)} />
                            <RoleMetric label="Upcoming (7D)" value={summary?.pendingActions ?? 0} icon="◷" amber />
                            <RoleMetric label="Clients" value={clients || cases.length} icon="♙" amber />
                        </div>
                        <div className="lawyer-grid">
                            <CaseTable title="Your Assigned Cases" cases={cases} columns={['caseNumber', 'clientUsername', 'status', 'updatedAt']} />
                            <HearingPanel cases={cases} />
                            <DocumentsPanel cases={cases} notifications={notifications} />
                        </div>
                    </>
                )}
            </main>
        </PortalShell>
    )
}

function JudgeDashboard({ cases, error, loading, notifications, onLogout, onNavigate, summary, username }) {
    const pending = cases.filter((item) => item.status !== 'CLOSED').length

    return (
        <PortalShell mode="judge" onLogout={onLogout} onNavigate={onNavigate} profile={`Hon'ble Justice ${displayName(username)}`}>
            <JudgeTopbar />
            <main className="role-main judge-main">
                <div className="judge-title-row">
                    <div>
                        <h1>Welcome, Hon'ble Justice {displayName(username)}</h1>
                        <p>Dashboard Overview • डैशबोर्ड अवलोकन</p>
                    </div>
                    <button type="button" className="judge-upload">⇧ Upload Order</button>
                </div>
                <RoleState error={error} loading={loading} />
                {!loading && !error && (
                    <>
                        <div className="role-metrics">
                            <RoleMetric label="Assigned Cases" value={cases.length} />
                            <RoleMetric label="Pending Decisions" value={pending} amber />
                            <RoleMetric label="Orders to Upload" value={summary?.pendingActions ?? pending} amber />
                            <RoleMetric label="Total Handled" value={(summary?.totalCases ?? cases.length) + (summary?.closedCases ?? 0)} />
                        </div>
                        <div className="judge-grid">
                            <UrgentItems cases={cases} />
                            <SchedulePanel cases={cases} />
                            <CaseTable title="Assigned Cases Portfolio" cases={cases} columns={['caseNumber', 'title', 'status', 'pending']} />
                        </div>
                        <QuickJudgeActions />
                    </>
                )}
            </main>
            <RoleFooter compact />
        </PortalShell>
    )
}

function PortalShell({ children, mode, onLogout, onNavigate, portalLabel = 'REGISTRY OFFICE', profile = 'Rajesh Kumar' }) {
    const isJudge = mode === 'judge'
    const items = isJudge
        ? ['Overview', 'Live Cases', 'Cause List', 'Judgments', 'Legal Library']
        : mode === 'lawyer'
            ? ['Dashboard', 'My Cases', 'Hearings', 'Documents', 'E-Filing', 'Calendar']
            : ['Dashboard', 'My Cases', 'Electronic Filings', 'Calendar', 'Legal Research']

    return (
        <div className={`role-app ${mode}`}>
            <aside className="role-sidebar">
                {mode === 'lawyer' && (
                    <div className="lawyer-profile">
                        <div className="portrait">⚖</div>
                        <strong>{profile}</strong>
                        <span>High Court of Delhi</span>
                        <button type="button" onClick={() => onNavigate('file-case')}>New Case Filing</button>
                    </div>
                )}
                {mode !== 'lawyer' && (
                    <div className="role-side-title">
                        <strong>{isJudge ? 'e-Court Justice' : 'Case Management'}</strong>
                        <span>{portalLabel}</span>
                    </div>
                )}
                <nav>
                    {items.map((item, index) => (
                        <button key={item} className={index === 0 ? 'active' : ''} type="button">
                            <span>{index === 0 ? '▦' : index === 1 ? '⌁' : index === 2 ? '□' : '▤'}</span>
                            {item}
                        </button>
                    ))}
                </nav>
                <div className="role-side-bottom">
                    {!isJudge && <button type="button" onClick={() => onNavigate('file-case')}>＋ File New Case</button>}
                    {isJudge && <button type="button">New Filing Request</button>}
                    <button type="button">⚙ Settings</button>
                    <button type="button" onClick={onLogout}>⇱ Logout</button>
                </div>
            </aside>
            <div className="role-page">{children}</div>
        </div>
    )
}

function TopNav({ onNavigate }) {
    return (
        <header className="client-topnav">
            <button type="button" onClick={() => onNavigate('home')}>E-Court Portal</button>
            <nav><span>Track Case</span><span>Cause List</span><span>Judgments</span><span>Help Desk</span></nav>
            <div><span>English / हिन्दी</span><strong>Sign In</strong></div>
        </header>
    )
}

function LawyerTopbar() {
    return (
        <header className="role-topbar simple">
            <strong>Justice Infrastructure System</strong>
            <span>E-Court Portal</span>
            <div><button>EN</button><button>HI</button><span>文</span><span>♧</span><span>◎</span></div>
        </header>
    )
}

function JudgeTopbar() {
    return (
        <header className="role-topbar simple">
            <strong>e-Court Justice</strong>
            <nav><span className="active">Dashboard</span><span>Hearings</span><span>Research</span></nav>
            <div><span>हिन्दी / English</span><span>♧</span><span>◎</span></div>
        </header>
    )
}

function Hero({ title, text }) {
    return (
        <section className="role-hero">
            <h1>{title}</h1>
            <p>{text}</p>
        </section>
    )
}

function RoleState({ error, loading }) {
    if (loading) return <div className="role-state">Loading dashboard from backend...</div>
    if (error) return <div className="role-state error">{error}</div>
    return null
}

function RoleMetric({ label, value, icon = '□', blue = false, green = false, amber = false }) {
    return (
        <article className="role-metric">
            <span className={green ? 'green' : amber ? 'amber' : blue ? 'blue' : ''}>{icon}</span>
            <strong>{label}</strong>
            <p>{String(value).padStart(value < 10 ? 2 : 1, '0')}</p>
        </article>
    )
}

function StatusMix({ active, pending, closed }) {
    return (
        <article className="status-mix">
            <strong>Case Status Mix</strong>
            <div><b>{active}<span>Active</span></b><b>{pending}<span>Pending</span></b><b>{closed}<span>Closed</span></b></div>
        </article>
    )
}

function CaseTable({ cases, columns, title }) {
    const visible = cases.slice(0, 5)
    return (
        <section className="role-panel case-list-panel">
            <div className="role-panel-head"><h2>{title}</h2><button type="button">View All</button></div>
            <table>
                <thead>
                    <tr>
                        {columns.map((column) => <th key={column}>{columnLabel(column)}</th>)}
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((courtCase) => (
                        <tr key={courtCase.caseNumber}>
                            {columns.map((column) => <td key={column}>{cellValue(courtCase, column)}</td>)}
                            <td>◎</td>
                        </tr>
                    ))}
                    {visible.length === 0 && <tr><td colSpan={columns.length + 1}>No cases found for this account.</td></tr>}
                </tbody>
            </table>
        </section>
    )
}

function ActivityPanel({ notifications }) {
    const items = notifications.slice(0, 3)
    return (
        <section className="role-panel activity-panel">
            <h2>Recent Activity</h2>
            {(items.length ? items : fallbackActivities()).map((item, index) => (
                <article key={item.id || item.title}>
                    <span>{index + 1}</span>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{formatDateTime(item.createdAt)}</small>
                </article>
            ))}
            <button type="button">View All Activity</button>
        </section>
    )
}

function HelpPanel() {
    return (
        <section className="help-panel">
            <h2>Legal Help Desk</h2>
            <p>Have questions about your filing status? Connect with our digital legal assistants.</p>
            <button type="button">Contact Support</button>
        </section>
    )
}

function HearingPanel({ cases }) {
    return (
        <section className="role-panel hearing-panel">
            <h2>Upcoming Hearings (7D)</h2>
            {cases.slice(0, 3).map((courtCase, index) => (
                <article key={courtCase.caseNumber}>
                    <time>OCT<br />{15 + index}</time>
                    <div><strong>{index === 0 ? '10:30 AM' : index === 1 ? '02:15 PM' : '11:00 AM'} - Bench {index + 4}</strong><span>{courtCase.caseNumber}</span></div>
                </article>
            ))}
        </section>
    )
}

function DocumentsPanel({ cases, notifications }) {
    const docs = notifications.length ? notifications : cases.slice(0, 3).map((item) => ({ title: `Document update`, message: item.caseNumber }))
    return (
        <section className="role-panel documents-panel">
            <h2>Recent Documents</h2>
            {docs.slice(0, 3).map((item) => <p key={item.id || item.message}><span>▤</span>{item.title}<small>{item.message}</small></p>)}
            <button type="button">Add Hearing Notes</button>
            <button type="button" className="primary">Upload Evidence</button>
        </section>
    )
}

function UrgentItems({ cases }) {
    return (
        <section className="urgent-panel">
            <h2>Urgent Action Items <span>• Action Needed</span></h2>
            {cases.slice(0, 2).map((courtCase, index) => (
                <article key={courtCase.caseNumber} className={index === 0 ? 'danger' : 'warning'}>
                    <span>{index === 0 ? '!' : '⌁'}</span>
                    <div><strong>{courtCase.caseNumber}</strong><p>{courtCase.title}</p></div>
                    <em>{index === 0 ? 'Decision Awaited' : 'Final Argument Review'}</em>
                </article>
            ))}
        </section>
    )
}

function SchedulePanel({ cases }) {
    return (
        <section className="schedule-panel">
            <h2>Today's Schedule <span>May 24</span></h2>
            {cases.slice(0, 3).map((courtCase, index) => (
                <article key={courtCase.caseNumber}>
                    <time>{index === 0 ? '10:30' : index === 1 ? '11:45' : '14:00'}</time>
                    <div><strong>{index === 2 ? 'Chambers' : 'Courtroom 04'}</strong><p>{courtCase.title}</p><span>{courtCase.caseNumber}</span></div>
                </article>
            ))}
            <button type="button">View Full Cause List</button>
        </section>
    )
}

function QuickJudgeActions() {
    return (
        <section className="judge-quick-actions">
            <button type="button">◎<span>View Case Details</span></button>
            <button type="button">◷<span>Update Status</span></button>
            <button type="button">⊕<span>Add Hearing Record</span></button>
            <button type="button">⌁<span>Upload Judgment</span></button>
        </section>
    )
}

function RoleFooter({ compact = false }) {
    return (
        <footer className={compact ? 'role-footer compact' : 'role-footer'}>
            <span>© 2024 E-Court Digital Mission. All rights reserved.</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Accessibility</span>
        </footer>
    )
}

function columnLabel(column) {
    return {
        caseNumber: 'Case Number',
        title: 'Parties',
        status: 'Status',
        filedDate: 'Next Hearing',
        clientUsername: 'Client Name',
        updatedAt: 'Last Update',
        pending: 'Days Pending',
    }[column] || column
}

function cellValue(courtCase, column) {
    if (column === 'status') return <span className={`status-pill ${String(courtCase.status).toLowerCase()}`}>{String(courtCase.status).replaceAll('_', ' ')}</span>
    if (column === 'filedDate' || column === 'updatedAt') return formatDate(courtCase[column])
    if (column === 'pending') return courtCase.status === 'CLOSED' ? '—' : '14 days'
    return courtCase[column] || 'N/A'
}

function displayName(username) {
    return username
        .replace(/demo$/i, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Rajesh Kumar'
}

function formatDate(value) {
    if (!value) return 'Pending'
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatDateTime(value) {
    if (!value) return 'Recently'
    return new Date(value).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fallbackActivities() {
    return [
        { title: 'New document uploaded', message: 'Evidence submission received', createdAt: null },
        { title: 'Hearing date rescheduled', message: 'Case moved to the next available slot', createdAt: null },
        { title: 'Order passed', message: 'Final decree issued', createdAt: null },
    ]
}
