import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../contexts/useApi'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const { request } = useApi()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mail: email, password, firstName: firstName || undefined, lastName }),
      })
      if (res.status === 409) {
        setError('This email is already taken.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('Registration failed. Please try again.')
        setLoading(false)
        return
      }
      navigate('/login')
    } catch {
      setError('Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">XSLT Transformer</h1>
        <p className="auth-subtitle">Create a new account</p>

        <form className="auth-form" onSubmit={(e) => { void handleSubmit(e) }}>
          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label">First name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="John"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value) }}
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Last name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Doe"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value) }}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value) }}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value) }}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link" onClick={() => { void navigate('/login') }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
