import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const auditSeeds = [
  'AUTH-001 Failed admin login from IP 192.168.1.45',
  'SYS-992 Database backup completed',
  'USR-451 Session token revoked for user',
  'API-204 Latency spike on /api/stats',
  'SEC-881 Firewall rule updated',
  'DAT-110 Sentiment model weights re-synced',
  'SYS-005 Memory usage crossed 80 percent',
]

function AdminPage() {
  const navigate = useNavigate()
  const [health, setHealth] = useState('Checking...')
  const [kpi, setKpi] = useState({ sessions: 0, users: 0, queue: 0, incidents: 0 })
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (sessionStorage.getItem('tp-admin-auth') !== 'true') {
      navigate('/admin-login')
      return
    }

    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health')
        const data = await response.json()
        setHealth(data.status === 'ok' ? 'System Healthy' : 'API Offline')
      } catch {
        setHealth('API Offline')
      }
    }

    const refresh = () => {
      setKpi({
        sessions: randomNumber(120, 170),
        users: randomNumber(700, 1100),
        queue: randomNumber(0, 15),
        incidents: randomNumber(0, 3),
      })

      setLogs(
        Array.from({ length: 6 }).map(() => ({
          t: new Date(Date.now() - randomNumber(0, 3600000)).toLocaleTimeString(),
          msg: auditSeeds[randomNumber(0, auditSeeds.length - 1)],
        })),
      )
    }

    checkHealth()
    refresh()
    const int = setInterval(refresh, 4000)
    return () => clearInterval(int)
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-200">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Core</h1>
            <p className="text-sm text-slate-400">{health}</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:border-slate-500"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
            <button
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300"
              onClick={() => {
                sessionStorage.removeItem('tp-admin-auth')
                navigate('/admin-login')
              }}
            >
              Admin Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="glass-card rounded-2xl p-4"><p className="text-xs uppercase text-slate-400">Active Sessions</p><p className="text-3xl font-bold text-white">{kpi.sessions}</p></div>
          <div className="glass-card rounded-2xl p-4"><p className="text-xs uppercase text-slate-400">Users Online</p><p className="text-3xl font-bold text-white">{kpi.users}</p></div>
          <div className="glass-card rounded-2xl p-4"><p className="text-xs uppercase text-slate-400">Alert Queue</p><p className="text-3xl font-bold text-white">{kpi.queue}</p></div>
          <div className="glass-card rounded-2xl p-4"><p className="text-xs uppercase text-slate-400">Critical Incidents</p><p className="text-3xl font-bold text-red-400">{kpi.incidents}</p></div>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Security Audit Log</h2>
          <div className="space-y-2 text-sm">
            {logs.map((log, idx) => (
              <div key={`${log.t}-${idx}`} className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
                <span className="mr-2 font-semibold text-blue-300">[{log.t}]</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
