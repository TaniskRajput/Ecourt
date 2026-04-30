import React from 'react'

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
                    <a className="nav-link">Cause List</a>
                    <a className="nav-link">Judgments</a>
                    <a className="nav-link">Help Desk</a>
                </nav>
                <div className="header-actions">
                    <div className="lang">English / हिन्दी</div>
                    <button className="btn btn-ghost" type="button" onClick={() => onNavigate('file-case')}>New Filing</button>
                    <button className="btn btn-ghost" type="button" onClick={() => onNavigate('signup')}>Sign Up</button>
                    <button className="btn btn-primary" type="button" onClick={() => onNavigate('login')}>Sign In</button>
                </div>
            </div>
        </header>
    )
}

function Hero() {
    return (
        <section className="lp-hero">
            <div className="lp-container hero-inner">
                <div className="hero-left">
                    <div className="eyebrow">SECURE CITIZEN PORTAL</div>
                    <h1 className="hero-title">Track Your Case<br /><span className="hindi">अपना मामला ट्रैक करें</span></h1>
                    <p className="hero-sub">Access real-time information regarding your judicial proceedings across all district and high courts in the country.</p>

                    <div className="search-row">
                        <input placeholder="Case Number / CNF" className="search-input" />
                        <input placeholder="Year" className="search-input small" />
                        <button className="btn btn-search">Search</button>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="hero-card-image">
                        <svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice"><rect width="600" height="360" fill="#e6f0ff" rx="14" /><text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#2b6cb0" fontSize="28">Court Image</text></svg>
                    </div>
                </div>
            </div>
        </section>
    )
}

function Features() {
    const items = [
        { title: 'View Hearings', desc: 'Access the scheduled dates for upcoming judicial hearings and review past proceeding logs.' },
        { title: 'Download Orders', desc: 'Search and download official signed court orders, judgments, and legal certifications in PDF format.' },
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
                            <a className="link">Learn More →</a>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

function MapAndPromo() {
    return (
        <section className="lp-mappromo">
            <div className="lp-container mappromo-inner">
                <div className="map-card">
                    <h3>Locate Your Court</h3>
                    <p>Find contact details, addresses, and navigation for District and High Courts across all states.</p>
                    <button className="btn btn-outline">Open Court Map</button>
                </div>
                <div className="promo-card">
                    <h3>e-Courts Services App</h3>
                    <p>Get instant updates on your mobile device. Download the official application today.</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-app">App Store</button>
                        <button className="btn btn-app">Play Store</button>
                    </div>
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
                <div className="footer-links">PRIVACY POLICY · TERMS OF USE · ACCESSIBILITY STATEMENT · CONTACT</div>
            </div>
        </footer>
    )
}

export default function LandingPage({ onNavigate }) {
    return (
        <div className="landing-page-root">
            <Header onNavigate={onNavigate} />
            <main>
                <Hero />
                <Features />
                <MapAndPromo />
            </main>
            <Footer />
        </div>
    )
}
