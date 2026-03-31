import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'Login failed')
        return
      }
      if (!data?.token) {
        setError('Login response missing token')
        return
      }
      localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch {
      setError('Unable to connect to backend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-1 text-3xl font-bold text-white">User Login</h1>
        <p className="mb-6 text-slate-400">Access the TrendPulse intelligence dashboard</p>

        <label className="mb-2 block text-sm text-slate-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-blue-500"
          required
        />

        <label className="mb-2 block text-sm text-slate-300">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-blue-500"
          required
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="mt-4 text-sm text-slate-400">
          New user?{' '}
          <Link to="/signup" className="font-semibold text-blue-300 hover:text-blue-200">
            Create account
          </Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
