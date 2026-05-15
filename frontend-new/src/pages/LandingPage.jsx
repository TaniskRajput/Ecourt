import React, { useState } from 'react'
import { publicTrackCases, publicGetCaseDetail, publicGetOrderDownloadUrl } from '../services/api'

function Header({ onNavigate }) {
    return (
        <header className="lp-header">
            <div className="lp-container header-inner">
                <button className="logo" type="button" onClick={() => onNavigate('home')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18L12 4 3 10Zm2 2h14M6 12v6M10 12v6M14 12v6M18 12v6M4 20h16" /></svg>
                    E-Court Portal
                </button>
                <nav className="lp-nav">
                    <a className="nav-link active">Track Case</a>
                </nav>
                <div className="header-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => onNavigate('signup')}>Sign Up</button>
                    <button className="btn btn-primary" type="button" onClick={() => onNavigate('login')}>Sign In</button>
                </div>
            </div>
        </header>
    )
}

function Hero({ onTrack }) {
    const [caseNumber, setCaseNumber] = useState('')
    const [year, setYear] = useState('')

    const handleSearch = () => {
        if (caseNumber.trim() || year.trim()) {
            onTrack(caseNumber.trim(), year.trim())
        }
    }

    return (
        <section className="lp-hero">
            <div className="lp-container hero-inner">
                <div className="hero-left">
                    <div className="eyebrow">SECURE CITIZEN PORTAL</div>
                    <h1 className="hero-title">Track Your Case<br /><span className="hindi">अपना मामला ट्रैक करें</span></h1>
                    <p className="hero-sub">Access real-time information regarding your judicial proceedings across all district and high courts in the country.</p>

                    <div className="search-row">
                        <input 
                            placeholder="Case Number / CNR" 
                            className="search-input" 
                            value={caseNumber} 
                            onChange={(e) => setCaseNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <input 
                            placeholder="Year" 
                            className="search-input small" 
                            value={year} 
                            onChange={(e) => setYear(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button className="btn btn-search" onClick={handleSearch}>Search</button>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="hero-card-image">
                        <img src="/image.png" alt="Court House" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                    </div>
                </div>
            </div>
        </section>
    )
}

function TrackResults({ results, onViewDetail }) {
    if (!results) return null
    if (results.length === 0) return (
        <section className="lp-features">
            <div className="lp-container">
                <p style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>No cases found matching your search criteria.</p>
            </div>
        </section>
    )

    return (
        <section className="lp-features">
            <div className="lp-container">
                <h2 className="section-title">Search Results ({results.length} found)</h2>
                <div className="features-grid">
                    {results.map((item) => (
                        <article className="feature-card" key={item.caseNumber} onClick={() => onViewDetail(item.caseNumber)} style={{ cursor: 'pointer' }}>
                            <div className="feature-icon">📋</div>
                            <h3>{item.caseNumber}</h3>
                            <p>{item.title}</p>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>{item.courtName} · {item.status}</span>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

function CaseTrackDetail({ detail, onBack }) {
    if (!detail) return null

    return (
        <section className="lp-features">
            <div className="lp-container">
                <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 20 }}>← Back to Search</button>
                <h2 className="section-title">{detail.caseNumber}</h2>
                <p style={{ color: '#64748b', marginBottom: 20 }}>{detail.title} · {detail.courtName} · Status: {detail.status}</p>
                
                {detail.hearings?.length > 0 && (
                    <>
                        <h3 style={{ marginBottom: 12, fontSize: 18 }}>Hearing History</h3>
                        <div className="features-grid">
                            {detail.hearings.map((h, i) => (
                                <article className="feature-card" key={i}>
                                    <h3>{h.hearingDate}</h3>
                                    <p>{h.remarks}</p>
                                    {h.nextHearingDate && <span style={{ fontSize: 13, color: '#0b2fbb' }}>Next: {h.nextHearingDate}</span>}
                                </article>
                            ))}
                        </div>
                    </>
                )}

                {detail.orders?.length > 0 && (
                    <>
                        <h3 style={{ marginTop: 30, marginBottom: 12, fontSize: 18 }}>Court Orders</h3>
                        <div className="features-grid">
                            {detail.orders.map((o) => (
                                <article className="feature-card" key={o.id}>
                                    <div className="feature-icon">📄</div>
                                    <h3>{o.originalFilename || o.title || 'Court Order'}</h3>
                                    <p>{o.orderType} · {o.uploadedAt ? new Date(o.uploadedAt).toLocaleDateString('en-IN') : ''}</p>
                                    <a 
                                        href={publicGetOrderDownloadUrl(detail.caseNumber, o.id)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="link"
                                    >Download Order →</a>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    )
}

function Features() {
    const items = [
        { title: 'View Hearings', desc: 'Access the scheduled dates for upcoming judicial hearings and review past proceeding logs.' },
        { title: 'Download Orders', desc: 'Search and download official signed court orders, judgments, and legal certifications.' },
        { title: 'Track Progress', desc: 'Follow the status of your filings from submission to final disposal with automated milestones.' },
    ]

    return (
        <section className="lp-features">
            <div className="lp-container">
                <h2 className="section-title">How can we help you today?</h2>
                <div className="features-grid">
                    {items.map(i => (
                        <article className="feature-card" key={i.title}>
                            <div className="feature-icon">📄</div>
                            <h3>{i.title}</h3>
                            <p>{i.desc}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

function Footer() {
    return (
        <footer className="lp-footer">
            <div className="lp-container footer-inner">
                <div>© 2024 DEPARTMENT OF JUSTICE. DIGITAL INDIA INITIATIVE.</div>
                <div className="footer-links">PRIVACY POLICY · TERMS OF USE · ACCESSIBILITY STATEMENT</div>
            </div>
        </footer>
    )
}

export default function LandingPage({ onNavigate }) {
    const [trackResults, setTrackResults] = useState(null)
    const [trackDetail, setTrackDetail] = useState(null)
    const [trackError, setTrackError] = useState('')

    const handleTrack = async (caseNumber, year) => {
        setTrackError('')
        setTrackDetail(null)
        try {
            const params = {}
            if (caseNumber) params.caseNumber = caseNumber
            if (year) params.year = year
            const data = await publicTrackCases(params)
            setTrackResults(data)
        } catch (err) {
            setTrackError(err.message || 'Unable to search cases.')
            setTrackResults([])
        }
    }

    const handleViewDetail = async (caseNumber) => {
        try {
            const data = await publicGetCaseDetail(caseNumber)
            setTrackDetail(data)
        } catch (err) {
            setTrackError(err.message || 'Unable to load case details.')
        }
    }

    return (
        <div className="landing-page-root">
            <Header onNavigate={onNavigate} />
            <main>
                <Hero onTrack={handleTrack} />
                {trackError && <p style={{ textAlign: 'center', color: '#dc2626', padding: '10px 0' }}>{trackError}</p>}
                {trackDetail ? (
                    <CaseTrackDetail detail={trackDetail} onBack={() => setTrackDetail(null)} />
                ) : trackResults ? (
                    <TrackResults results={trackResults} onViewDetail={handleViewDetail} />
                ) : (
                    <Features />
                )}
            </main>
            <Footer />
        </div>
    )
}
