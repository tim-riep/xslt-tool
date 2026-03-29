import './Auth.css'

interface RegisterProps {
  onNavigateToLogin: () => void
}

export default function Register({ onNavigateToLogin }: RegisterProps) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">XSLT Transformer</h1>
        <p className="auth-subtitle">Create a new account</p>

        <form className="auth-form">
          <div className="auth-row">
            <div className="auth-field">
              <label className="auth-label">First name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="John"
                autoComplete="given-name"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Last name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Doe"
                autoComplete="family-name"
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
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-button">Create account</button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link" onClick={onNavigateToLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
