import React, { useEffect, useMemo, useState } from 'react'
import { getAdminUsers, getAllCases, getDashboardSummary } from '../services/api'
import DashboardLayout from '../components/DashboardLayout'

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
                setError(err.message || 'Unable to load admin dashboard.')
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
        const unassignedCases = summary?.unassignedCases ?? 0
        const activeJudges = summary?.activeJudges || users.filter((user) => user.role === 'JUDGE' && user.active).length
        return { totalCases, totalUsers, activeCases, closedCases, pendingCases, unassignedCases, activeJudges }
    }, [summary, cases, users])

    const recentCases = summary?.recentCases?.length ? summary.recentCases : cases.slice(0, 5)

    const openCase = (caseNumber) => {
        localStorage.setItem('selectedCaseNumber', caseNumber)
        onNavigate('case-details')
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Dashboard">
            <main className="admin-main">
                <section className="admin-content">
                    <div className="admin-welcome">
                        <p>Welcome, System Administrator</p>
                        <h1>You have {summary?.pendingActions ?? metrics.pendingCases} pending actions. {metrics.unassignedCases > 0 ? `${metrics.unassignedCases} cases need judge assignment.` : 'All cases are assigned.'}</h1>
                    </div>

                    {loading && <div className="admin-state">Loading admin dashboard...</div>}
                    {error && (
                        <div className="admin-state error">
                            {error}
                            <button type="button" onClick={() => onNavigate('login')}>Sign in as admin</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="admin-metrics">
                                <article className="metric-card">
                                    <div className="metric-icon">▣</div>
                                    <strong>Total Cases</strong>
                                    <p>{metrics.totalCases}</p>
                                </article>
                                <article className="metric-card">
                                    <div className="metric-icon warm">♙</div>
                                    <strong>Total Users</strong>
                                    <p>{metrics.totalUsers}</p>
                                </article>
                                <article className="metric-card">
                                    <div className="metric-icon">⌁</div>
                                    <strong>Active Cases</strong>
                                    <p>{metrics.activeCases}</p>
                                </article>
                                <article className="metric-card">
                                    <div className="metric-icon">⚖</div>
                                    <strong>Active Judges</strong>
                                    <p>{metrics.activeJudges}</p>
                                </article>
                            </div>

                            <div className="admin-dashboard-grid">
                                {/* Status Distribution */}
                                <section className="admin-panel">
                                    <h2>Case Status Distribution</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                                        <div style={{ textAlign: 'center', padding: 16, background: '#eff6ff', borderRadius: 8 }}>
                                            <strong style={{ fontSize: 28, color: '#0b2fbb' }}>{metrics.activeCases}</strong>
                                            <p style={{ margin: 0, fontSize: 13 }}>Active</p>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: 16, background: '#fef3c7', borderRadius: 8 }}>
                                            <strong style={{ fontSize: 28, color: '#d97706' }}>{metrics.pendingCases}</strong>
                                            <p style={{ margin: 0, fontSize: 13 }}>Pending</p>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: 16, background: '#fce7f3', borderRadius: 8 }}>
                                            <strong style={{ fontSize: 28, color: '#be185d' }}>{metrics.closedCases}</strong>
                                            <p style={{ margin: 0, fontSize: 13 }}>Closed</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Recent Cases */}
                                <section className="admin-panel recent-panel">
                                    <div className="panel-title-row">
                                        <h2>Recent Cases</h2>
                                        <button type="button" onClick={() => onNavigate('case-search')}>View All</button>
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Case ID</th>
                                                <th>Title</th>
                                                <th>Filed</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentCases.map((courtCase) => (
                                                <tr key={courtCase.caseNumber}>
                                                    <td>{courtCase.caseNumber}</td>
                                                    <td>{courtCase.title}</td>
                                                    <td>{formatDate(courtCase.filedDate)}</td>
                                                    <td><span className={`status-pill ${String(courtCase.status).toLowerCase()}`}>{String(courtCase.status).replaceAll('_', ' ')}</span></td>
                                                    <td><button onClick={() => openCase(courtCase.caseNumber)}>Open</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>

                                {/* Quick Actions */}
                                <aside className="admin-side-stack">
                                    <section className="quick-actions">
                                        <h2>Quick Actions</h2>
                                        <button type="button" onClick={() => onNavigate('file-case')}>⊕ File New Case</button>
                                        <button type="button" onClick={() => onNavigate('user-details')}>♙ Manage Users</button>
                                        <button type="button" onClick={() => onNavigate('case-search')}>⌕ Search Cases</button>
                                    </section>
                                </aside>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </DashboardLayout>
    )
}

function formatDate(value) {
    if (!value) return 'Not filed'
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
}
