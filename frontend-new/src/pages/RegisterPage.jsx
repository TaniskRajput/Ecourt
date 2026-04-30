import React, { useMemo, useState } from 'react'
import {
    completeRegistration,
    requestRegistrationOtp,
    verifyRegistrationOtp,
} from '../services/api'
import { AuthFooter } from './LoginPage'

const unsupportedBackendDetails = [
    'Full name',
    'Mobile number',
    'Aadhaar / identity reference',
    'State, district, and court',
    'Postal address',
    'Bar Council ID and enrolment number',
    'Professional documents and ID proof',
]

export default function RegisterPage({ onNavigate }) {
    const [step, setStep] = useState(0)
    const [verificationTicket, setVerificationTicket] = useState('')
    const [form, setForm] = useState({
        fullName: '',
        username: '',
        email: '',
        mobile: '',
        aadhaarLast4: '',
        role: 'LAWYER',
        password: '',
        confirmPassword: '',
        otp: '',
        state: '',
        district: '',
        court: '',
        address: '',
        barCouncilId: '',
        enrollmentNumber: '',
        practiceArea: '',
        idProofType: 'Aadhaar',
    })
    const [error, setError] = useState('')
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    const passwordScore = useMemo(() => {
        let score = 0
        if (form.password.length >= 8) score += 1
        if (/[A-Z]/.test(form.password)) score += 1
        if (/[0-9]/.test(form.password)) score += 1
        if (/[^A-Za-z0-9]/.test(form.password)) score += 1
        return score
    }, [form.password])

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const requestOtp = async (event) => {
        event.preventDefault()
        setError('')
        setStatus('')

        if (form.password !== form.confirmPassword) {
            setError('Password and confirm password must match.')
            return
        }

        setLoading(true)
        try {
            const data = await requestRegistrationOtp({
                username: form.username,
                email: form.email,
                role: form.role,
            })
            setStatus(data.message || 'OTP sent to your email.')
            setStep(1)
        } catch (err) {
            setError(err.message || 'Could not request OTP.')
        } finally {
            setLoading(false)
        }
    }

    const verifyOtp = async (event) => {
        event.preventDefault()
        setError('')
        setStatus('')
        setLoading(true)

        try {
            const data = await verifyRegistrationOtp({
                email: form.email,
                otp: form.otp,
            })
            setVerificationTicket(data.verificationTicket)
            setStatus(data.message || 'OTP verified.')
            setStep(2)
        } catch (err) {
            setError(err.message || 'Could not verify OTP.')
        } finally {
            setLoading(false)
        }
    }

    const finishRegistration = async (event) => {
        event.preventDefault()
        setError('')
        setStatus('')
        setLoading(true)

        try {
            const data = await completeRegistration({
                username: form.username,
                email: form.email,
                password: form.password,
                confirmPassword: form.confirmPassword,
                verificationTicket,
                role: form.role,
            })
            setStatus(`${data.message || 'Registration completed successfully.'} You can sign in now.`)
        } catch (err) {
            setError(err.message || 'Could not complete registration.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="register-page">
            <RegisterHeader onNavigate={onNavigate} />

            <main className="register-shell">
                <StepIndicator step={step} />

                <div className="register-grid">
                    <section className="registration-panel" aria-live="polite">
                        {step === 0 && (
                            <AccountDetails
                                form={form}
                                loading={loading}
                                passwordScore={passwordScore}
                                onChange={updateField}
                                onSubmit={requestOtp}
                            />
                        )}

                        {step === 1 && (
                            <OtpDetails
                                email={form.email}
                                otp={form.otp}
                                loading={loading}
                                onChange={updateField}
                                onSubmit={verifyOtp}
                                onBack={() => setStep(0)}
                            />
                        )}

                        {step === 2 && (
                            <ProfessionalDetails
                                form={form}
                                loading={loading}
                                onChange={updateField}
                                onSubmit={finishRegistration}
                                onBack={() => setStep(1)}
                            />
                        )}

                        {error && <p className="form-alert error register-alert">{error}</p>}
                        {status && <p className="form-alert success register-alert">{status}</p>}
                    </section>

                    <aside className="registration-aside" aria-label="Registration guidance">
                        <div className="security-card">
                            <div>
                                <h2>Trust & Security</h2>
                                <p>Encrypted case filings and secure digital signatures.</p>
                            </div>
                        </div>

                        <div className="instruction-card">
                            <h3>
                                <span className="info-icon">i</span>
                                Instructions
                            </h3>
                            <ul>
                                <li>Use an email inbox you can access immediately for OTP verification.</li>
                                <li>Advocates should keep Bar Council and enrolment details ready.</li>
                                <li>Password must be at least 8 characters and include letters and numbers.</li>
                            </ul>
                        </div>

                        <div className="backend-note">
                            <h3>Backend Coverage</h3>
                            <p>The current backend saves only username, email, password, role, OTP status, and verification ticket.</p>
                            <p>These details are shown for a complete e-court account profile but are not saved yet:</p>
                            <ul>
                                {unsupportedBackendDetails.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="assist-card">
                            <div className="assist-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0v4a3 3 0 0 1-3 3h-2M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" /></svg>
                            </div>
                            <div>
                                <span>Need Assistance?</span>
                                <strong>Toll Free: 1800-456-7890</strong>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <AuthFooter />
        </div>
    )
}

function RegisterHeader({ onNavigate }) {
    return (
        <header className="register-header">
            <button className="register-brand" type="button" onClick={() => onNavigate('home')}>
                E-Court Portal
            </button>
            <nav aria-label="Primary">
                <button type="button" onClick={() => onNavigate('home')}>Track Case</button>
                <button type="button">Cause List</button>
                <button type="button">Judgments</button>
                <button type="button">Help Desk</button>
            </nav>
            <div className="register-header-actions">
                <span>English / हिन्दी</span>
                <button type="button" onClick={() => onNavigate('login')}>Sign In</button>
            </div>
        </header>
    )
}

function StepIndicator({ step }) {
    const steps = [
        { label: 'Account Details', icon: 'user' },
        { label: 'OTP Verification', icon: 'otp' },
        { label: 'Professional Details', icon: 'doc' },
    ]

    return (
        <div className="step-indicator" aria-label="Registration steps">
            {steps.map((item, index) => (
                <React.Fragment key={item.label}>
                    <div className={index === step ? 'step-item active' : index < step ? 'step-item complete' : 'step-item'}>
                        <div className="step-icon" aria-hidden="true">
                            <StepIcon name={item.icon} />
                        </div>
                        <span>{item.label}</span>
                    </div>
                    {index < steps.length - 1 && <div className="step-line" aria-hidden="true" />}
                </React.Fragment>
            ))}
        </div>
    )
}

function StepIcon({ name }) {
    if (name === 'otp') {
        return <svg viewBox="0 0 24 24"><path d="M6 4h12v16H6V4Zm4 4h4M10 15h.01M14 15h.01M12 15h.01" /></svg>
    }
    if (name === 'doc') {
        return <svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7V3Zm7 0v5h4M10 13h5M10 17h5" /></svg>
    }
    return <svg viewBox="0 0 24 24"><path d="M15 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></svg>
}

function AccountDetails({ form, loading, passwordScore, onChange, onSubmit }) {
    return (
        <form className="register-form" onSubmit={onSubmit}>
            <h1>Create Portal Account</h1>
            <p>Step 1: Enter your primary credentials to initiate the verification process.</p>

            <div className="two-column">
                <TextField label="Full Name / पूरा नाम" required value={form.fullName} onChange={(value) => onChange('fullName', value)} placeholder="Justice Sahay" />
                <TextField label="Username / उपयोगकर्ता नाम" required value={form.username} onChange={(value) => onChange('username', value)} placeholder="jsahay_legal" />
            </div>

            <TextField label="Email Address / ईमेल पता" required type="email" value={form.email} onChange={(value) => onChange('email', value)} placeholder="example@highcourt.gov.in" />

            <div className="two-column">
                <TextField label="Mobile Number / मोबाइल" required value={form.mobile} onChange={(value) => onChange('mobile', value)} placeholder="+91 98765 43210" />
                <TextField label="Aadhaar Last 4 / आधार" value={form.aadhaarLast4} onChange={(value) => onChange('aadhaarLast4', value)} placeholder="1234" maxLength="4" />
            </div>

            <fieldset className="role-options">
                <legend>Portal Role / पोर्टल भूमिका</legend>
                <RoleOption role="LAWYER" title="Lawyer" subtitle="Bar ID Required" selected={form.role === 'LAWYER'} onChange={onChange} />
                <RoleOption role="CLIENT" title="Client" subtitle="Litigant Access" selected={form.role === 'CLIENT'} onChange={onChange} />
            </fieldset>

            <div className="two-column">
                <TextField label="Password / पासवर्ड" required type="password" value={form.password} onChange={(value) => onChange('password', value)} />
                <TextField label="Confirm / पुष्टि करें" required type="password" value={form.confirmPassword} onChange={(value) => onChange('confirmPassword', value)} />
            </div>

            <div className="strength-meter" data-score={passwordScore}>
                <span />
                <strong>Strength: {passwordScore >= 3 ? 'Strong' : passwordScore === 2 ? 'Medium' : 'Weak'}</strong>
            </div>

            <button className="register-submit" type="submit" disabled={loading}>
                {loading ? 'Requesting OTP...' : 'Request OTP / ओटीपी का अनुरोध करें'}
                <svg viewBox="0 0 24 24"><path d="m4 5 16 7-16 7 3-7-3-7Zm3 7h13" /></svg>
            </button>
        </form>
    )
}

function OtpDetails({ email, otp, loading, onChange, onSubmit, onBack }) {
    return (
        <form className="register-form" onSubmit={onSubmit}>
            <h1>Verify Email OTP</h1>
            <p>Step 2: Enter the 6-digit OTP sent to {email || 'your registered email'}.</p>

            <TextField label="Email Address / ईमेल पता" value={email} disabled onChange={() => {}} />
            <TextField label="One-Time Password / ओटीपी" required value={otp} onChange={(value) => onChange('otp', value)} placeholder="123456" maxLength="6" />

            <div className="otp-helper">
                <strong>Verification note</strong>
                <span>The backend returns a temporary verification ticket after OTP success. That ticket is required for the final account creation step.</span>
            </div>

            <div className="register-actions-row">
                <button className="secondary-button" type="button" onClick={onBack}>Back</button>
                <button className="register-submit" type="submit" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
            </div>
        </form>
    )
}

function ProfessionalDetails({ form, loading, onChange, onSubmit, onBack }) {
    const isLawyer = form.role === 'LAWYER'

    return (
        <form className="register-form" onSubmit={onSubmit}>
            <h1>Professional Details</h1>
            <p>Step 3: Add court and identity profile details. These are needed for a complete e-court account profile, but the current backend does not save them yet.</p>

            <div className="two-column">
                <TextField label="State / राज्य" required value={form.state} onChange={(value) => onChange('state', value)} placeholder="Delhi" />
                <TextField label="District / जिला" required value={form.district} onChange={(value) => onChange('district', value)} placeholder="New Delhi" />
            </div>

            <TextField label="Preferred Court / न्यायालय" required value={form.court} onChange={(value) => onChange('court', value)} placeholder="Delhi High Court" />
            <TextField label="Postal Address / पता" required value={form.address} onChange={(value) => onChange('address', value)} placeholder="Chamber / residence address" />

            {isLawyer && (
                <div className="two-column">
                    <TextField label="Bar Council ID / बार आईडी" required value={form.barCouncilId} onChange={(value) => onChange('barCouncilId', value)} placeholder="D/1234/2024" />
                    <TextField label="Enrolment No. / नामांकन" required value={form.enrollmentNumber} onChange={(value) => onChange('enrollmentNumber', value)} placeholder="BCI-2024-0091" />
                </div>
            )}

            <div className="two-column">
                <TextField label="Practice / Case Area" value={form.practiceArea} onChange={(value) => onChange('practiceArea', value)} placeholder="Civil, Criminal, Tax" />
                <SelectField label="ID Proof Type" value={form.idProofType} onChange={(value) => onChange('idProofType', value)} options={['Aadhaar', 'PAN', 'Passport', 'Voter ID']} />
            </div>

            <div className="missing-backend-box">
                <strong>Not wired to backend yet</strong>
                <span>To save this section permanently, add these fields to the registration DTO/entity or create a separate user profile table and endpoint.</span>
            </div>

            <div className="register-actions-row">
                <button className="secondary-button" type="button" onClick={onBack}>Back</button>
                <button className="register-submit" type="submit" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
            </div>
        </form>
    )
}

function TextField({ label, value, onChange, type = 'text', required = false, disabled = false, placeholder = '', maxLength }) {
    return (
        <label className="register-field">
            <span>{label} {required && <b>*</b>}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={maxLength}
            />
        </label>
    )
}

function SelectField({ label, value, onChange, options }) {
    return (
        <label className="register-field">
            <span>{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        </label>
    )
}

function RoleOption({ role, title, subtitle, selected, onChange }) {
    return (
        <label className={selected ? 'role-card selected' : 'role-card'}>
            <input
                type="radio"
                name="role"
                value={role}
                checked={selected}
                onChange={(event) => onChange('role', event.target.value)}
            />
            <span>
                <strong>{title}</strong>
                <small>{subtitle}</small>
            </span>
        </label>
    )
}
