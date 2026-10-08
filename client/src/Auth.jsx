import { useState } from 'react'
import { apiRequest } from './api.js'
import './Auth.css'

export function LoginScreen({ onLogin, serverError, onRetry }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      onLogin(result.user)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <a className="auth-brand" href="/" aria-label="Carepoint home">
        <span className="auth-brand-mark"><span>+</span></span>
        <span><strong>carepoint</strong><small>HOSPITAL SYSTEM</small></span>
      </a>
      <div className="auth-intro"><span className="auth-eyebrow">SECURE STAFF PORTAL</span><h1>Welcome back</h1><p>Sign in to access your clinic workspace.</p></div>
      {serverError
        ? <div className="auth-error" role="alert"><strong>Can't reach the clinic server</strong><span>{serverError}</span><button type="button" className="auth-retry" onClick={onRetry}>Try again</button></div>
        : <form className="auth-form" onSubmit={submit}>
          <label><span>Email address</span><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@clinic.com" /></label>
          <label><span>Password</span><input type="password" autoComplete="current-password" maxLength="72" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in securely'}</button>
        </form>}
      <div className="auth-notice"><span aria-hidden="true">🔒</span><p>Accounts are created by your clinic administrator. Contact them if you need access.</p></div>
      <p className="auth-disclaimer">Do not enter real patient information until your installation is security-reviewed and approved for clinical use.</p>
    </section>
    <div className="auth-side-note"><span>BETTER ORGANIZED CARE</span><p>Your clinic operations,<br />in one secure workspace.</p></div>
  </main>
}

export function LoadingScreen({ message = 'Connecting securely…' }) {
  return <main className="auth-page auth-loading"><div className="auth-spinner" aria-hidden="true" /><p>{message}</p></main>
}
