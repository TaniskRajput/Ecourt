import React, { useEffect, useState } from 'react'
import { getNotifications, markAllNotificationsRead } from '../services/api'

export default function DashboardLayout({ 
    children, 
    activeItem = 'Dashboard', 
    onNavigate 
}) {
    const role = localStorage.getItem('role') || 'CLIENT'
    const username = localStorage.getItem('username') || 'User'
    const [unread, setUnread] = useState(0)

    useEffect(() => {
        getNotifications()
            .then(data => setUnread(data.unreadCount || 0))
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
        { label: 'Dashboard', icon: '▦', page: role === 'ADMIN' ? 'admin' : 'dashboard' },
        { label: 'Case Search', icon: '⌕', page: 'case-search' },
        { label: 'Filing Center', icon: '＋', page: 'file-case' },
    ]

    if (role === 'ADMIN') {
        navItems.push({ label: 'User Management', icon: '♙', page: 'user-details' })
    }

    navItems.push(
        { label: 'Notifications', icon: '🔔', page: 'notifications', badge: unread },
        { label: 'Profile', icon: '◉', page: 'profile' },
    )

    return (
        <div className="unified-app">
            <aside className="unified-sidebar">
                <div className="sidebar-brand" onClick={() => onNavigate(role === 'ADMIN' ? 'admin' : 'dashboard')}>
                    <span>⚖</span>
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
                            {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-user-card" onClick={() => onNavigate('profile')}>
                    <div className="sidebar-user-avatar">{displayName.charAt(0)}</div>
                    <div>
                        <strong>{displayName}</strong>
                        <small>{role.charAt(0) + role.slice(1).toLowerCase()} Portal</small>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button type="button" className="logout-btn" onClick={logout}>⇱ Logout</button>
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
