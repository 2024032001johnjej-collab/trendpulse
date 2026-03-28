import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = (event) => {
    event.preventDefault()
    if (username === 'admin' && password === 'admin123') {
      sessionStorage.setItem('tp-admin-auth', 'true')
      navigate('/admin')
      return
    }
    setError('Invalid admin credentials')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-1 text-3xl font-bold text-white">Admin Core Login</h1>
        <p className="mb-6 text-slate-400">Demo credentials: admin / admin123</p>

        <label className="mb-2 block text-sm text-slate-300">Admin ID</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-rose-500"
          required
        />

        <label className="mb-2 block text-sm text-slate-300">Passcode</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-rose-500"
          required
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button className="w-full rounded-lg bg-rose-600 px-4 py-2 font-bold text-white transition hover:bg-rose-500">
          Authenticate Admin
        </button>
      </form>
    </div>
  )
}

export default AdminLoginPage
