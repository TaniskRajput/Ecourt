import React, { useEffect, useMemo, useState } from 'react'
import { getAdminUsers, getAllCases, getDashboardSummary } from '../services/api'

export default function AdminDashboardPage({ onNavigate }) {
    const [summary, setSummary] = useState(null)
    const [users, setUsers] = useState([])
    const [cases, setCases] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let mounted = true

        async function loadDashboard() {
            setLoading(true)
            setError('')
            try {
                const [summaryData, userData, caseData] = await Promise.all([
                    getDashboardSummary(),
                    getAdminUsers(),
                    getAllCases(),
                ])

                if (!mounted) return
                setSummary(summaryData)
                setUsers(userData.content || [])
                setCases(Array.isArray(caseData) ? caseData : [])
            } catch (err) {
                if (!mounted) return
                setError(err.message || 'Unable to load admin dashboard. Sign in with an admin account.')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadDashboard()
        return () => {
            mounted = false
        }
    }, [])

    const metrics = useMemo(() => {
        const totalCases = summary?.totalCases ?? cases.length
        const totalUsers = summary?.totalUsers || users.length
        const activeCases = summary?.activeCases ?? cases.filter((item) => item.status !== 'CLOSED').length
        const closedCases = summary?.closedCases ?? cases.filter((item) => item.status === 'CLOSED').length
        const pendingCases = cases.filter((item) => ['FILED', 'SCRUTINY', 'PENDING'].includes(item.status)).length
        const activeJudges = summary?.activeJudges || users.filter((user) => user.role === 'JUDGE' && user.active).length
        return { totalCases, totalUsers, activeCases, closedCases, pendingCases, activeJudges }
    }, [summary, cases, users])

    const casesByCourt = useMemo(() => {
        const counts = cases.reduce((acc, courtCase) => {
            const court = courtCase.courtName || 'Unassigned Court'
            acc[court] = (acc[court] || 0) + 1
            return acc
        }, {})
        const entries = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
        return entries.length ? entries : [['Supreme Bench', 0], ['High Court Division', 0], ['District & Sessions', 0]]
    }, [cases])

    const recentCases = summary?.recentCases?.length ? summary.recentCases : cases.slice(0, 5)
    const maxCourtCount = Math.max(...casesByCourt.map(([, count]) => count), 1)

    const logout = () => {
        localStorage.clear()
        onNavigate('login')
    }

    return (
        <div className="admin-app">
            <AdminSidebar onNavigate={onNavigate} onLogout={logout} />
            <main className="admin-main">
                <AdminTopbar />

                <section className="admin-content">
                    <div className="admin-welcome">
                        <p>Welcome, System Administrator</p>
                        <h1>You have {summary?.pendingActions ?? metrics.pendingCases} pending actions today. System health is stable.</h1>
                    </div>

                    {loading && <div className="admin-state">Loading admin dashboard from backend...</div>}
                    {error && (
                        <div className="admin-state error">
                            {error}
                            <button type="button" onClick={() => onNavigate('login')}>Sign in as admin</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="admin-metrics">
                                <MetricCard title="Total Cases" value={metrics.totalCases} accent="+12%" icon="▣" />
                                <MetricCard title="Total Users" value={metrics.totalUsers} accent="This month" icon="♙" warm />
                                <StatusCard active={metrics.activeCases} pending={metrics.pendingCases} closed={metrics.closedCases} />
                                <HealthCard />
                            </div>

                            <div className="admin-dashboard-grid">
                                <section className="admin-panel chart-panel">
                                    <div className="panel-title-row">
                                        <div>
                                            <h2>Monthly Case Filing Trend</h2>
                                            <p>Aggregated system-wide data for {new Date().getFullYear()}</p>
                                        </div>
                                        <div className="segmented">
                                            <button type="button">Weekly</button>
                                            <button type="button" className="active">Monthly</button>
                                        </div>
                                    </div>
                                    <BarChart cases={cases} />
                                </section>

                                <section className="admin-panel pending-panel">
                                    <h2>Pending Actions</h2>
                                    <article className="action-card danger">
                                        <strong>Critical Assignment Needed</strong>
                                        <p>{summary?.unassignedCases ?? 0} cases require bench allocation before EOD.</p>
                                        <button type="button">Action Now</button>
                                    </article>
                                    <article className="action-card warning">
                                        <strong>Review Required</strong>
                                        <p>Updated filing rules awaiting system-wide approval.</p>
                                        <button type="button">View Document</button>
                                    </article>
                                </section>

                                <section className="admin-panel recent-panel">
                                    <div className="panel-title-row">
                                        <h2>Recent Cases List</h2>
                                        <button type="button">View All</button>
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Case ID</th>
                                                <th>Title</th>
                                                <th>Filing Date</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentCases.map((courtCase) => (
                                                <tr key={courtCase.caseNumber}>
                                                    <td>{courtCase.caseNumber}</td>
                                                    <td>{courtCase.title}</td>
                                                    <td>{formatDate(courtCase.filedDate)}</td>
                                                    <td><span className={`status-pill ${String(courtCase.status).toLowerCase()}`}>{formatStatus(courtCase.status)}</span></td>
                                                    <td>◎</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>

                                <aside className="admin-side-stack">
                                    <section className="admin-panel court-panel">
                                        <h2>Cases by Court</h2>
                                        {casesByCourt.map(([court, count]) => (
                                            <div className="court-row" key={court}>
                                                <div><span>{court}</span><strong>{count}</strong></div>
                                                <i><b style={{ width: `${(count / maxCourtCount) * 100}%` }} /></i>
                                            </div>
                                        ))}
                                    </section>

                                    <section className="quick-actions">
                                        <h2>Quick Actions</h2>
                                        <button type="button" onClick={() => onNavigate('file-case')}>⊕<span>File Case</span></button>
                                        <button type="button">♙<span>Users</span></button>
                                        <button type="button">▤<span>Logs</span></button>
                                        <button type="button">⚙<span>System</span></button>
                                    </section>
                                </aside>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    )
}

function AdminSidebar({ onNavigate, onLogout }) {
    const items = ['Dashboard', 'Case Management', 'Judges', 'Filings', 'Users', 'Reports']
    return (
        <aside className="admin-sidebar">
            <button className="admin-logo" type="button" onClick={() => onNavigate('admin')}>
                <span>▥</span>
                <strong>E-Court Admin<small>High Court Division</small></strong>
            </button>
            <nav>
                {items.map((item) => (
                    <button className={item === 'Dashboard' ? 'active' : ''} type="button" key={item}>
                        <span>{item === 'Dashboard' ? '▦' : item === 'Users' ? '♙' : item === 'Reports' ? '▣' : '⌁'}</span>
                        {item}
                    </button>
                ))}
            </nav>
            <div className="admin-side-bottom">
                <button type="button" onClick={() => onNavigate('file-case')}>＋ New Filing</button>
                <button type="button">? Help Center</button>
                <button type="button" onClick={onLogout}>⇱ Logout</button>
            </div>
        </aside>
    )
}

function AdminTopbar() {
    return (
        <header className="admin-topbar">
            <label className="admin-search">
                <span>⌕</span>
                <input placeholder="Search cases, judges, or filings..." />
            </label>
            <div className="admin-toolbar">
                <button type="button">◎</button>
                <button type="button">♧</button>
                <button type="button">⚙</button>
                <div className="admin-profile">
                    <strong>Admin Profile</strong>
                    <span>Super Admin</span>
                </div>
                <div className="admin-avatar">⚖</div>
            </div>
        </header>
    )
}

function MetricCard({ title, value, accent, icon, warm = false }) {
    return (
        <article className="metric-card">
            <div className={warm ? 'metric-icon warm' : 'metric-icon'}>{icon}</div>
            <span>{accent}</span>
            <strong>{title}</strong>
            <p>{Number(value || 0).toLocaleString()}</p>
        </article>
    )
}

function StatusCard({ active, pending, closed }) {
    const total = Math.max(active + pending + closed, 1)
    return (
        <article className="status-card admin-panel">
            <h2>Status Distribution</h2>
            <div className="status-donut" />
            <ul>
                <li><b className="blue-dot" /> Active ({Math.round((active / total) * 100)}%)</li>
                <li><b className="amber-dot" /> Pending ({Math.round((pending / total) * 100)}%)</li>
                <li><b className="red-dot" /> Closed ({Math.round((closed / total) * 100)}%)</li>
            </ul>
        </article>
    )
}

function HealthCard() {
    return (
        <article className="health-card admin-panel">
            <h2>System Health</h2>
            <HealthRow label="Database Status" value="Stable" width="100%" good />
            <HealthRow label="Storage Usage" value="82%" width="82%" />
            <div className="api-dots"><span>API Endpoints</span><b /><b /><b /><i /></div>
        </article>
    )
}

function HealthRow({ label, value, width, good = false }) {
    return (
        <div className="health-row">
            <div><span>{label}</span><strong className={good ? 'good' : ''}>{value}</strong></div>
            <i><b style={{ width }} /></i>
        </div>
    )
}

function BarChart({ cases }) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const counts = months.map((month, index) => {
        const monthIndex = index
        return cases.filter((courtCase) => {
            if (!courtCase.filedDate) return false
            return new Date(courtCase.filedDate).getMonth() === monthIndex
        }).length
    })
    const fallback = [35, 52, 48, 74, 82, 61]
    const values = counts.some(Boolean) ? counts : fallback
    const max = Math.max(...values, 1)

    return (
        <div className="admin-bars">
            {months.map((month, index) => (
                <div key={month}>
                    <i style={{ height: `${Math.max((values[index] / max) * 88, 10)}%` }} />
                    <span>{month}</span>
                </div>
            ))}
        </div>
    )
}

function formatDate(value) {
    if (!value) return 'Not filed'
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatStatus(value) {
    return String(value || 'NEW').replaceAll('_', ' ')
}
