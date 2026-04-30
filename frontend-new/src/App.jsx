import React, { useEffect, useState } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FileCasePage from './pages/FileCasePage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import RoleDashboardPage from './pages/RoleDashboardPage'
import CaseWorkspacePage from './pages/CaseWorkspacePage'

function readPageFromHash() {
    const hash = window.location.hash.replace('#/', '').replace('#', '')
    if (hash === 'login' || hash === 'signup' || hash === 'file-case' || hash === 'admin' || hash === 'dashboard' || hash === 'case-search' || hash === 'case-details' || hash === 'case-history' || hash === 'user-details') {
        return hash
    }
    return 'home'
}

export default function App() {
    const [page, setPage] = useState(readPageFromHash)

    useEffect(() => {
        const handleHashChange = () => setPage(readPageFromHash())
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const navigate = (nextPage) => {
        window.location.hash = nextPage === 'home' ? '/' : `/${nextPage}`
        setPage(nextPage)
    }

    if (page === 'login') {
        return <LoginPage onNavigate={navigate} />
    }

    if (page === 'signup') {
        return <RegisterPage onNavigate={navigate} />
    }

    if (page === 'file-case') {
        return <FileCasePage onNavigate={navigate} />
    }

    if (page === 'admin') {
        return <AdminDashboardPage onNavigate={navigate} />
    }

    if (page === 'dashboard') {
        return <RoleDashboardPage onNavigate={navigate} />
    }

    if (page === 'case-search' || page === 'case-details' || page === 'case-history' || page === 'user-details') {
        return <CaseWorkspacePage mode={page} onNavigate={navigate} />
    }

    return (
        <LandingPage onNavigate={navigate} />
    )
}
