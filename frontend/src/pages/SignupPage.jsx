import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.message || 'Signup failed')
        return
      }
      navigate('/login')
    } catch {
      setError('Unable to connect to backend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-1 text-3xl font-bold text-white">Create Account</h1>
        <p className="mb-6 text-slate-400">Sign up to access TrendPulse monitoring</p>

        <label className="mb-2 block text-sm text-slate-300">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-blue-500"
          required
        />

        <label className="mb-2 block text-sm text-slate-300">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-blue-500"
          required
        />

        <label className="mb-2 block text-sm text-slate-300">Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-blue-500"
          required
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="mt-4 text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-300 hover:text-blue-200">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}

export default SignupPage
