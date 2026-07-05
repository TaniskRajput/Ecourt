import React, { useEffect, useState } from 'react'
import { getNotifications, getDashboardSummary } from '../services/api'

export default function DashboardLayout({ 
    children, 
    activeItem = 'Dashboard', 
    onNavigate 
}) {
    const role = localStorage.getItem('role') || 'CLIENT'
    const username = localStorage.getItem('username') || 'User'
    const [unread, setUnread] = useState(0)
    const [activeCount, setActiveCount] = useState(12) // Fallback to 12 as in mockup

    useEffect(() => {
        getNotifications()
            .then(data => setUnread(data.unreadCount || 0))
            .catch(() => {})
            
        getDashboardSummary()
            .then(data => {
                if (data && typeof data.activeCases === 'number') {
                    setActiveCount(data.activeCases)
                }
            })
            .catch(() => {})
    }, [])

    const logout = () => {
        localStorage.clear()
        onNavigate('login')
    }

    const displayName = username
        .replace(/demo$/i, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase()) || 'User'

    const navItems = [
        { 
            label: 'Dashboard', 
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9"></rect>
                    <rect x="14" y="3" width="7" height="5"></rect>
                    <rect x="14" y="12" width="7" height="9"></rect>
                    <rect x="3" y="16" width="7" height="5"></rect>
                </svg>
            ), 
            page: role === 'ADMIN' ? 'admin' : 'dashboard' 
        },
        { 
            label: 'Case Search', 
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            ), 
            page: 'case-search' 
        },
        { 
            label: 'Filing Center', 
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
            ), 
            page: 'file-case' 
        },
    ]

    if (role === 'ADMIN') {
        navItems.push({ 
            label: 'User Management', 
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            ), 
            page: 'user-details' 
        })
    }

    navItems.push(
        { 
            label: 'Notifications', 
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            ), 
            page: 'notifications', 
            badge: unread 
        },
        { 
            label: 'Profile', 
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            ), 
            page: 'profile' 
        },
    )

    return (
        <div className="unified-app">
            <aside className="unified-sidebar">
                <div className="sidebar-brand" onClick={() => onNavigate(role === 'ADMIN' ? 'admin' : 'dashboard')}>
                    <span>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="9" y1="22" x2="9" y2="14"></line>
                            <line x1="15" y1="22" x2="15" y2="14"></line>
                            <line x1="3" y1="22" x2="21" y2="22"></line>
                            <path d="M10 6L3 14H21L14 6"></path>
                            <path d="M12 2v4"></path>
                        </svg>
                    </span>
                    <strong>E-COURT<small>Digital Mission</small></strong>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <button 
                            key={item.label} 
                            className={activeItem === item.label ? 'active' : ''} 
                            type="button"
                            onClick={() => onNavigate(item.page)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            {item.label}
                            {item.badge > 0 && <span className="sidebar-orange-dot"></span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-section-title">QUICK ACTIONS</div>
                <div className="sidebar-quick-actions">
                    <button type="button" onClick={() => onNavigate('file-case')}>
                        <span className="qa-icon-wrapper blue-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </span>
                        <span className="qa-label">New Filing</span>
                        <span className="qa-arrow">&rsaquo;</span>
                    </button>
                    <button type="button" onClick={() => onNavigate('case-search')}>
                        <span className="qa-icon-wrapper purple-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                        </span>
                        <span className="qa-label">Case Status</span>
                        <span className="qa-arrow">&rsaquo;</span>
                    </button>
                    <button type="button" onClick={() => alert('Help Center: Toll Free 1800-456-7890. Email: support@ecourt.gov.in')}>
                        <span className="qa-icon-wrapper green-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        </span>
                        <span className="qa-label">Help Center</span>
                        <span className="qa-arrow">&rsaquo;</span>
                    </button>
                </div>

                <div className="sidebar-insights-container">
                    <div className="insights-title">
                        <span className="green-dot">●</span> SYSTEM INSIGHTS
                    </div>
                    <div className="insights-card">
                        <div className="insights-card-label">ACTIVE CASES</div>
                        <div className="insights-card-value">{activeCount}</div>
                    </div>
                    <div className="insights-card">
                        <div className="insights-card-label">NEXT HEARING</div>
                        <div className="insights-card-hearing-date">July 10, 2026</div>
                        <div className="insights-card-hearing-loc">Supreme Court, Hall 4</div>
                    </div>
                </div>

                <div className="sidebar-user-card" onClick={() => onNavigate('profile')}>
                    <div className="sidebar-user-avatar">{displayName.charAt(0)}</div>
                    <div>
                        <strong>{displayName}</strong>
                        <small>{role.toUpperCase()} PORTAL</small>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button type="button" className="logout-btn" onClick={logout}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="11 17 6 12 11 7"></polyline>
                            <line x1="6" y1="12" x2="20" y2="12"></line>
                        </svg>
                        Logout
                    </button>
                </div>
            </aside>

            <div className="unified-content">
                <div className="unified-page-area">
                    {children}
                </div>
            </div>
        </div>
    )
}
