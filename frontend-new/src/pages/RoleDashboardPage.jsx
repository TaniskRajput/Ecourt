import React, { useEffect, useState } from 'react'
import { getDashboardSummary, getMyCases, getNotifications } from '../services/api'
import DashboardLayout from '../components/DashboardLayout'

export default function RoleDashboardPage({ onNavigate }) {
    const [summary, setSummary] = useState(null)
    const [cases, setCases] = useState([])
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const role = localStorage.getItem('role') || 'CLIENT'
    const username = localStorage.getItem('username') || 'User'

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

    const openCase = (caseNumber) => {
        localStorage.setItem('selectedCaseNumber', caseNumber)
        onNavigate('case-details')
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activeItem="Dashboard">
            <main className="role-main">
                <section className="role-hero">
                    <h1>Welcome, {displayName(username)}</h1>
                    <p>
                        {role === 'JUDGE' 
                            ? 'Review assigned cases and manage hearings from your judicial dashboard.'
                            : role === 'LAWYER'
                            ? `You have ${summary?.pendingActions ?? 0} actions pending. Stay updated with your case filings.`
                            : 'Monitor your active litigation proceedings and manage electronic filings.'
                        }
                    </p>
                </section>

                {loading && <div className="role-state">Loading dashboard...</div>}
                {error && <div className="role-state error">{error}</div>}

                {!loading && !error && (
                    <>
                        <div className="role-metrics">
                            <MetricCard label="Total Cases" value={summary?.totalCases ?? cases.length} />
                            <MetricCard label="Active" value={summary?.activeCases ?? cases.filter(c => c.status !== 'CLOSED').length} />
                            <MetricCard label="Closed" value={summary?.closedCases ?? cases.filter(c => c.status === 'CLOSED').length} />
                            <MetricCard label="Pending Actions" value={summary?.pendingActions ?? 0} />
                        </div>

                        <div className="lawyer-grid">
                            {/* Case Table */}
                            <section className="role-panel case-list-panel">
                                <div className="role-panel-head">
                                    <h2>{role === 'JUDGE' ? 'Assigned Cases' : 'My Cases'}</h2>
                                    <button type="button" onClick={() => onNavigate('case-search')}>View All</button>
                                </div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Case Number</th>
                                            <th>Title</th>
                                            <th>Status</th>
                                            <th>Filed Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cases.slice(0, 5).map((c) => (
                                            <tr key={c.caseNumber}>
                                                <td>{c.caseNumber}</td>
                                                <td>{c.title}</td>
                                                <td><StatusPill value={c.status} /></td>
                                                <td>{formatDate(c.filedDate)}</td>
                                                <td><button onClick={() => openCase(c.caseNumber)}>Open</button></td>
                                            </tr>
                                        ))}
                                        {cases.length === 0 && <tr><td colSpan="5">No cases found.</td></tr>}
                                    </tbody>
                                </table>
                            </section>

                            {/* Notifications Panel */}
                            <section className="role-panel activity-panel">
                                <h2>Recent Notifications</h2>
                                {notifications.length === 0 && <p style={{ color: '#64748b', padding: '10px 0' }}>No notifications yet.</p>}
                                {notifications.slice(0, 5).map((n) => (
                                    <article key={n.id}>
                                        <span style={{ opacity: n.read ? 0.4 : 1 }}>●</span>
                                        <div>
                                            <strong>{n.title}</strong>
                                            <p>{n.message}</p>
                                            <small>{formatDateTime(n.createdAt)}</small>
                                        </div>
                                    </article>
                                ))}
                            </section>
                        </div>
                    </>
                )}
            </main>
            <footer className="role-footer">
                <span>© 2024 E-Court Digital Mission. All rights reserved.</span>
            </footer>
        </DashboardLayout>
    )
}

function MetricCard({ label, value }) {
    return (
        <article className="role-metric">
            <strong>{label}</strong>
            <p>{String(value).padStart(value < 10 ? 2 : 1, '0')}</p>
        </article>
    )
}

function StatusPill({ value }) {
    return <span className={`status-pill ${String(value).toLowerCase()}`}>• {String(value || 'ACTIVE').replaceAll('_', ' ')}</span>
}

function displayName(username) {
    return username
        .replace(/demo$/i, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'User'
}

function formatDate(value) {
    if (!value) return 'Pending'
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatDateTime(value) {
    if (!value) return 'Recently'
    return new Date(value).toLocaleString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
