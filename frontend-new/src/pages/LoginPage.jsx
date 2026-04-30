import React, { useState } from 'react'
import { beginGoogleAuth, login } from '../services/api'

export default function LoginPage({ onNavigate }) {
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [status, setStatus] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleBusy, setGoogleBusy] = useState(false)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setStatus('')
        setLoading(true)

        try {
            const data = await login(identifier, password)
            localStorage.setItem('jwt', data.token)
            localStorage.setItem('username', data.username)
            localStorage.setItem('role', data.role)
            localStorage.setItem('rememberLogin', remember ? 'true' : 'false')
            setStatus(`Signed in as ${data.username}.`)
            onNavigate(data.role === 'ADMIN' ? 'admin' : 'dashboard')
        } catch (err) {
            setError(err.message || 'Login failed. Check credentials.')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setGoogleBusy(true)
        setError('')
        setStatus('')

        try {
            const data = await beginGoogleAuth()
            setStatus(data.message || 'Google sign-in request received.')
        } catch (err) {
            setError(err.message || 'Google sign-in is not available yet.')
        } finally {
            setGoogleBusy(false)
        }
    }

    return (
        <div className="auth-page">
            <AuthHeader onNavigate={onNavigate} active="login" />
            <main className="auth-shell">
                <section className="login-card" aria-labelledby="login-title">
                    <div className="auth-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="img">
                            <path d="M6 21h12M7 17h10M14.4 4.2l5.4 5.4M11 7.6l5.4 5.4M9 6l9 9M5.8 10.2l8-8 2.8 2.8-8 8H5.8v-2.8Z" />
                        </svg>
                    </div>

                    <h1 id="login-title">Secure Login</h1>
                    <p className="auth-subtitle">Access the unified E-Court management system</p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <label htmlFor="identifier">Email or Username</label>
                        <div className="field-with-icon">
                            <span aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>
                            </span>
                            <input
                                id="identifier"
                                type="text"
                                placeholder="lawyer.id@justice.gov"
                                value={identifier}
                                onChange={(event) => setIdentifier(event.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>

                        <label htmlFor="password">Password</label>
                        <div className="field-with-icon">
                            <span aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Zm6 4v2" /></svg>
                            </span>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                className="icon-button"
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>
                            </button>
                        </div>

                        <div className="form-row">
                            <label className="check-row">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(event) => setRemember(event.target.checked)}
                                />
                                Remember Me
                            </label>
                            <button className="link-button" type="button">Forgot Password?</button>
                        </div>

                        {error && <p className="form-alert error">{error}</p>}
                        {status && <p className="form-alert success">{status}</p>}

                        <button className="submit-button" type="submit" disabled={loading}>
                            {loading ? 'Signing In...' : 'Sign In'}
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </button>
                    </form>

                    <div className="divider"><span>Or continue with</span></div>

                    <button className="google-button" type="button" onClick={handleGoogleSignIn} disabled={googleBusy}>
                        <span className="google-g" aria-hidden="true">G</span>
                        {googleBusy ? 'Checking Google...' : 'Sign in with Google'}
                    </button>

                    <p className="auth-note">
                        Authorized personnel only.
                        <button type="button" onClick={() => onNavigate('signup')}>Apply for e-filing credentials</button>
                    </p>
                </section>
            </main>
            <AuthFooter />
        </div>
    )
}

function AuthHeader({ onNavigate, active }) {
    return (
        <header className="auth-header">
            <button className="brand-button" type="button" onClick={() => onNavigate('home')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18L12 4 3 10Zm2 2h14M6 12v6M10 12v6M14 12v6M18 12v6M4 20h16" /></svg>
                E-Court Portal
            </button>
            <nav className="auth-nav" aria-label="Primary">
                <button type="button" onClick={() => onNavigate('home')}>Track Case</button>
                <button type="button">Cause List</button>
                <button type="button">Judgments</button>
                <button type="button">Help Desk</button>
            </nav>
            <div className="auth-actions">
                <span>English / हिन्दी</span>
                <button className={active === 'signup' ? 'nav-pill active' : 'nav-pill'} type="button" onClick={() => onNavigate('signup')}>Sign Up</button>
                <button className={active === 'login' ? 'nav-pill active' : 'nav-pill'} type="button" onClick={() => onNavigate('login')}>Sign In</button>
            </div>
        </header>
    )
}

export function AuthFooter() {
    return (
        <footer className="auth-footer">
            <span>© 2024 Department of Justice. Digital India Initiative.</span>
            <span>Privacy Policy&nbsp;&nbsp;&nbsp; Terms of Use&nbsp;&nbsp;&nbsp; Accessibility Statement&nbsp;&nbsp;&nbsp; Contact</span>
        </footer>
    )
}
