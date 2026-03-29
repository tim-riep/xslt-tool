import './Auth.css'

interface LoginProps {
  onNavigateToRegister: () => void
}

export default function Login({ onNavigateToRegister }: LoginProps) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">XSLT Transformer</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        <form className="auth-form">
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
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-button">Sign in</button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-link" onClick={onNavigateToRegister}>
            Register
          </button>
        </p>
      </div>
    </div>
  )
}
