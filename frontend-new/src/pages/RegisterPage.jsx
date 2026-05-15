import React, { useMemo, useState } from 'react'
import {
    register,
} from '../services/api'
import { AuthFooter } from './LoginPage'

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



    const finishRegistration = async (event) => {
        event.preventDefault()
        setError('')
        setStatus('')

        if (form.password !== form.confirmPassword) {
            setError('Password and confirm password must match.')
            return
        }

        setLoading(true)

        try {
            const data = await register({
                username: form.username,
                email: form.email,
                password: form.password,
                role: form.role,
                fullName: form.fullName,
                mobileNumber: form.mobile,
                aadhaarLast4: form.aadhaarLast4,
                state: form.state,
                district: form.district,
                preferredCourt: form.court,
                address: form.address,
                barCouncilId: form.barCouncilId,
                enrollmentNumber: form.enrollmentNumber,
                practiceArea: form.practiceArea,
                idProofType: form.idProofType,
            })
            setStatus(`${data.message || 'Registration completed successfully.'} You can sign in now.`)
            setStep(1) // success state
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
                <div className="register-grid">
                    <section className="registration-panel" aria-live="polite">
                        {step === 0 ? (
                            <form className="register-form" onSubmit={finishRegistration}>
                                <h1>Create Portal Account</h1>
                                <p>Fill in your details below to register. No email verification required.</p>

                                <div className="two-column">
                                    <TextField label="Full Name / पूरा नाम" required value={form.fullName} onChange={(value) => updateField('fullName', value)} placeholder="Justice Sahay" />
                                    <TextField label="Username / उपयोगकर्ता नाम" required value={form.username} onChange={(value) => updateField('username', value)} placeholder="jsahay_legal" />
                                </div>

                                <TextField label="Email Address / ईमेल पता" required type="email" value={form.email} onChange={(value) => updateField('email', value)} placeholder="example@highcourt.gov.in" />

                                <div className="two-column">
                                    <TextField label="Mobile Number / मोबाइल" required value={form.mobile} onChange={(value) => updateField('mobile', value)} placeholder="+91 98765 43210" />
                                    <TextField label="Aadhaar Last 4 / आधार" value={form.aadhaarLast4} onChange={(value) => updateField('aadhaarLast4', value)} placeholder="1234" maxLength="4" />
                                </div>

                                <fieldset className="role-options">
                                    <legend>Portal Role / पोर्टल भूमिका</legend>
                                    <RoleOption role="LAWYER" title="Lawyer" subtitle="Bar ID Required" selected={form.role === 'LAWYER'} onChange={updateField} />
                                    <RoleOption role="CLIENT" title="Client" subtitle="Litigant Access" selected={form.role === 'CLIENT'} onChange={updateField} />
                                </fieldset>

                                <div className="two-column">
                                    <TextField label="Password / पासवर्ड" required type="password" value={form.password} onChange={(value) => updateField('password', value)} />
                                    <TextField label="Confirm / पुष्टि करें" required type="password" value={form.confirmPassword} onChange={(value) => updateField('confirmPassword', value)} />
                                </div>

                                <div className="strength-meter" data-score={passwordScore}>
                                    <span />
                                    <strong>Strength: {passwordScore >= 3 ? 'Strong' : passwordScore === 2 ? 'Medium' : 'Weak'}</strong>
                                </div>

                                <div className="section-divider">Professional & Court Details</div>

                                <div className="two-column">
                                    <TextField label="State / राज्य" required value={form.state} onChange={(value) => updateField('state', value)} placeholder="Delhi" />
                                    <TextField label="District / जिला" required value={form.district} onChange={(value) => updateField('district', value)} placeholder="New Delhi" />
                                </div>

                                <TextField label="Preferred Court / न्यायालय" required value={form.court} onChange={(value) => updateField('court', value)} placeholder="Delhi High Court" />
                                <TextField label="Postal Address / पता" required value={form.address} onChange={(value) => updateField('address', value)} placeholder="Chamber / residence address" />

                                {form.role === 'LAWYER' && (
                                    <div className="two-column">
                                        <TextField label="Bar Council ID / बार आईडी" required value={form.barCouncilId} onChange={(value) => updateField('barCouncilId', value)} placeholder="D/1234/2024" />
                                        <TextField label="Enrolment No. / नामांकन" required value={form.enrollmentNumber} onChange={(value) => updateField('enrollmentNumber', value)} placeholder="BCI-2024-0091" />
                                    </div>
                                )}

                                <div className="two-column">
                                    <TextField label="Practice / Case Area" value={form.practiceArea} onChange={(value) => updateField('practiceArea', value)} placeholder="Civil, Criminal, Tax" />
                                    <SelectField label="ID Proof Type" value={form.idProofType} onChange={(value) => updateField('idProofType', value)} options={['Aadhaar', 'PAN', 'Passport', 'Voter ID']} />
                                </div>

                                <button className="register-submit" type="submit" disabled={loading}>
                                    {loading ? 'Creating Account...' : 'Create Account / खाता बनाएँ'}
                                    <svg viewBox="0 0 24 24"><path d="m4 5 16 7-16 7 3-7-3-7Zm3 7h13" /></svg>
                                </button>
                            </form>
                        ) : (
                            <div className="success-screen">
                                <div className="success-icon">✓</div>
                                <h1>Success!</h1>
                                <p>{status}</p>
                                <button className="register-submit" onClick={() => onNavigate('login')}>Sign In Now</button>
                            </div>
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
                                <li>Advocates should keep Bar Council and enrolment details ready.</li>
                                <li>Password must be at least 8 characters and include letters and numbers.</li>
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
            </nav>
            <div className="register-header-actions">
                <button type="button" onClick={() => onNavigate('login')}>Sign In</button>
            </div>
        </header>
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
