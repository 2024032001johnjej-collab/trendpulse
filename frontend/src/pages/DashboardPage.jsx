import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import WordCloud from 'wordcloud'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)

const API_BASE = 'http://localhost:5000'

function DashboardPage() {
  const navigate = useNavigate()
  const wordCloudRef = useRef(null)
  const [userName, setUserName] = useState('Loading...')
  const [loading, setLoading] = useState(true)
  const [isSpiking, setIsSpiking] = useState(false)
  const [error, setError] = useState('')

  const [stats, setStats] = useState({ positive: 0, neutral: 0, negative: 0, hourly: [] })
  const [crisis, setCrisis] = useState({ score: 0, status: 'Safe', recommended_action: 'Monitor normal activity.' })
  const [historyPosts, setHistoryPosts] = useState([])
  const [wordData, setWordData] = useState([])

  const token = localStorage.getItem('token')
  const isAdmin = sessionStorage.getItem('tp-admin-auth') === 'true'

  useEffect(() => {
    if (!token && !isAdmin) {
      navigate('/login')
      return
    }

    if (isAdmin) {
      setUserName('Administrator')
      return
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!response.ok) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }
        setUserName(data.user?.name || 'User')
      } catch {
        setUserName('User (Offline)')
      }
    }

    loadProfile()
  }, [isAdmin, navigate, token])

  useEffect(() => {
    const pollData = async () => {
      try {
        const [statsRes, crisisRes, historyRes, cloudRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats?hours=24`),
          fetch(`${API_BASE}/api/crisis-score`),
          fetch(`${API_BASE}/api/posts?limit=60`),
          fetch(`${API_BASE}/api/wordcloud?limit=80`),
        ])

        const [statsData, crisisData, historyData, cloudData] = await Promise.all([
          statsRes.json(),
          crisisRes.json(),
          historyRes.json(),
          cloudRes.json(),
        ])

        if (!statsRes.ok || !crisisRes.ok || !historyRes.ok || !cloudRes.ok) {
          throw new Error('Failed to load dashboard metrics')
        }

        setStats({
          positive: statsData.positive || 0,
          neutral: statsData.neutral || 0,
          negative: statsData.negative || 0,
          hourly: Array.isArray(statsData.hourly) ? statsData.hourly : [],
        })
        setCrisis(crisisData)
        setHistoryPosts(Array.isArray(historyData.posts) ? historyData.posts : [])
        setWordData(Array.isArray(cloudData.words) ? cloudData.words : [])
        setError('')
      } catch (err) {
        setError(err.message || 'Unable to load live dashboard data')
      } finally {
        setLoading(false)
      }
    }

    pollData()
    const interval = setInterval(pollData, 2000)
    return () => clearInterval(interval)
  }, [])

  const isCrisis = (crisis.score || 0) >= 70

  useEffect(() => {
    const canvas = wordCloudRef.current
    if (!canvas) return

    canvas.width = canvas.parentElement.clientWidth
    canvas.height = 260

    const list = wordData.slice(0, 40).map((item) => [item.word, item.count * 10 + 10])
    if (!list.length) return

    WordCloud(canvas, {
      list,
      rotateRatio: 0,
      backgroundColor: 'transparent',
      color: () => ['#60a5fa', '#818cf8', '#22c55e', '#f43f5e', '#f59e0b'][Math.floor(Math.random() * 5)],
    })
  }, [wordData])

  const donutData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [stats.positive, stats.neutral, stats.negative],
        backgroundColor: ['#10b981', '#64748b', '#ef4444'],
        borderWidth: 0,
      },
    ],
  }

  const lineData = useMemo(() => {
    const labels = stats.hourly.map((h) => h.hour?.slice(11) || h.hour)
    return {
      labels,
      datasets: [
        {
          label: 'Positive',
          data: stats.hourly.map((h) => h.positive || 0),
          borderColor: '#10b981',
          backgroundColor: '#10b98122',
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Negative',
          data: stats.hourly.map((h) => h.negative || 0),
          borderColor: '#ef4444',
          backgroundColor: '#ef444422',
          fill: true,
          tension: 0.35,
        },
      ],
    }
  }, [stats.hourly])

  const spike = async () => {
    if (isSpiking) return

    try {
      setIsSpiking(true)
      await fetch(`${API_BASE}/api/posts/spike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 20, username: userName || 'demo-user' }),
      })
    } finally {
      setIsSpiking(false)
    }
  }

  return (
    <div className="bg-dot-grid min-h-screen bg-[radial-gradient(circle_at_top_right,_#1f1b4d_0%,_#0f172a_45%,_#020617_100%)] p-6 text-slate-200 md:p-8">
      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">TrendPulse Dashboard</h1>
            <p className="text-sm text-slate-400">Logged in as {userName}</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
              onClick={spike}
              disabled={isSpiking}
            >
              {isSpiking ? 'Injecting spike...' : 'Simulate Crisis Spike'}
            </button>
            <button
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
              onClick={() => {
                localStorage.removeItem('token')
                sessionStorage.removeItem('tp-admin-auth')
                navigate('/login')
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {isCrisis && (
          <div className="alert-pulse rounded-2xl border border-red-500/50 bg-gradient-to-r from-red-900/70 to-red-500/15 p-4">
            <p className="font-bold text-red-200">CRITICAL BRAND THREAT DETECTED</p>
            <p className="text-sm text-red-100/90">Monday morning crisis pattern detected. Escalate immediately.</p>
          </div>
        )}

        {error && <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-amber-300">{error}</div>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Positive</p>
            <p className="text-3xl font-bold text-emerald-400">{stats.positive}</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Neutral</p>
            <p className="text-3xl font-bold text-slate-300">{stats.neutral}</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Negative</p>
            <p className="text-3xl font-bold text-red-400">{stats.negative}</p>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400">Crisis Score</p>
            <p className={`text-3xl font-bold ${isCrisis ? 'text-red-400' : 'text-emerald-400'}`}>{crisis.score || 0}</p>
            <p className="text-xs text-slate-400">{crisis.status || 'Safe'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-card rounded-2xl p-4 lg:col-span-1">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Sentiment Distribution</h2>
            <div className="h-64">
              <Doughnut data={donutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
          <div className="glass-card rounded-2xl p-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Hourly Trend</h2>
            <div className="h-64">
              <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass-card rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Latest Posts</h2>
            {loading && <p className="text-slate-400">Loading live posts...</p>}
            {!loading && (
              <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
                {historyPosts.slice(0, 25).map((post, idx) => {
                  const sentimentLabel = typeof post.sentiment === 'string' ? post.sentiment : post.sentiment?.label || '-'
                  return (
                  <div key={`${post._id || idx}`} className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{post.username || post.author || 'User'}</span>
                      <span>{sentimentLabel}</span>
                    </div>
                    <p>{post.content || post.text || '-'}</p>
                  </div>
                )})}
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">Word Cloud</h2>
            <canvas ref={wordCloudRef} className="h-[260px] w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
