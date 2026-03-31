import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'
const DEFAULT_COMMENTS_POLL_MS = 15000

function safeStorageGet(storageName, key) {
  try {
    const storage = storageName === 'session' ? window.sessionStorage : window.localStorage
    return storage.getItem(key)
  } catch {
    return null
  }
}

function DashboardPage() {
  const navigate = useNavigate()
  const wordCloudRef = useRef(null)
  const [userName, setUserName] = useState('Loading...')
  const [loading, setLoading] = useState(true)
  const [isSpiking, setIsSpiking] = useState(false)
  const [error, setError] = useState('')
  const [modelTraining, setModelTraining] = useState(false)
  const [modelTrainStatus, setModelTrainStatus] = useState('')

  const [stats, setStats] = useState({ positive: 0, neutral: 0, negative: 0, hourly: [] })
  const [crisis, setCrisis] = useState({ score: 0, status: 'Safe', recommended_action: 'Monitor normal activity.' })
  const [historyPosts, setHistoryPosts] = useState([])
  const [wordData, setWordData] = useState([])
  const [postUrl, setPostUrl] = useState('https://x.com/search?q=AI&f=live')
  const [commentsMaxResults, setCommentsMaxResults] = useState(100)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [liveCommentsEnabled, setLiveCommentsEnabled] = useState(true)
  const [commentsLastUpdated, setCommentsLastUpdated] = useState('')
  const [commentsPollMs, setCommentsPollMs] = useState(DEFAULT_COMMENTS_POLL_MS)
  const [commentInsights, setCommentInsights] = useState({
    summary: { critical: 0, neutral: 0, positive: 0, total: 0 },
    semantic: { top_keywords: [], themes: [] },
    comments: [],
    meta: {
      source: '-',
      modelEngine: 'bert',
      requestedMaxResults: 0,
      returnedCount: 0,
      live: false,
      stale: false,
      warning: '',
    },
  })

  const commentsRequestInFlightRef = useRef(false)

  const token = safeStorageGet('local', 'token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token')
            navigate('/login')
            return
          }
          setUserName('User (Auth Offline)')
          return
        }
        if (!data?.user) {
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
  }, [navigate, token])

  const pollData = useCallback(async () => {
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
        const apiError = statsData?.error || crisisData?.error || historyData?.error || cloudData?.error
        throw new Error(apiError || 'Failed to load dashboard metrics')
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
  }, [])

  useEffect(() => {
    pollData()
    const interval = setInterval(pollData, 2000)
    return () => clearInterval(interval)
  }, [pollData])

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

  const manualApiBody = useMemo(
    () => JSON.stringify({
      post_url: postUrl.trim() || 'https://x.com/search?q=AI&f=live',
      max_results: commentsMaxResults,
      engine: 'bert',
    }),
    [commentsMaxResults, postUrl],
  )

  const manualApiCommand = useMemo(
    () => `Invoke-RestMethod -Method Post -Uri "${API_BASE}/api/social/comments/analyze" -ContentType "application/json" -Body '${manualApiBody}'`,
    [manualApiBody],
  )

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

  const trainModelFromApi = async () => {
    if (modelTraining) return

    try {
      setModelTraining(true)
      setModelTrainStatus('Training on live telemetry stream...')

      const response = await fetch(`${API_BASE}/api/model/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'bert', max_results: 20, sample_only: true }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Training failed')
      }

      setModelTrainStatus(
        `Training complete: ${data.samples || 0} samples, inserted ${data.inserted || 0}, removed ${data.removed || 0}, skipped ${data.skipped || 0}`,
      )
      await pollData()
    } catch (err) {
      setModelTrainStatus(`Training error: ${err.message || 'unknown error'}`)
    } finally {
      setModelTraining(false)
    }
  }

  const analyzePostComments = useCallback(async ({ silent = false } = {}) => {
    if (!postUrl.trim()) {
      if (!silent) {
        setCommentsError('Enter a valid post/search URL for comment extraction.')
      }
      return
    }

    if (commentsRequestInFlightRef.current) {
      return
    }

    try {
      commentsRequestInFlightRef.current = true
      if (!silent) {
        setCommentsLoading(true)
      }
      setCommentsError('')

      const response = await fetch(`${API_BASE}/api/social/comments/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_url: postUrl.trim(),
          max_results: commentsMaxResults,
          engine: 'bert',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || data?.warning || 'Comment analysis failed')
      }

      setCommentInsights({
        summary: data.summary || { critical: 0, neutral: 0, positive: 0, total: 0 },
        semantic: data.semantic || { top_keywords: [], themes: [] },
        comments: Array.isArray(data.comments) ? data.comments : [],
        meta: {
          source: data.source || '-',
          modelEngine: data.model_engine || 'bert',
          requestedMaxResults: Number(data.requested_max_results || commentsMaxResults || 0),
          returnedCount: Number(data.returned_count || (Array.isArray(data.comments) ? data.comments.length : 0)),
          live: Boolean(data.live),
          stale: Boolean(data.stale),
          warning: data.warning || '',
        },
      })

      if (data?.rate_limited && data?.rate_limit?.retry_after) {
        const nextMs = Math.min(Math.max(Number(data.rate_limit.retry_after) * 1000, 15000), 300000)
        setCommentsPollMs(nextMs)
      } else {
        setCommentsPollMs(DEFAULT_COMMENTS_POLL_MS)
      }

      if (data?.warning) {
        setCommentsError(data.warning)
      }

      setCommentsLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setCommentsError(err.message || 'Unable to analyze comments right now')
    } finally {
      commentsRequestInFlightRef.current = false
      if (!silent) {
        setCommentsLoading(false)
      }
    }
  }, [commentsMaxResults, postUrl])

  useEffect(() => {
    if (!liveCommentsEnabled) {
      return
    }

    analyzePostComments({ silent: true })
    const interval = setInterval(() => {
      analyzePostComments({ silent: true })
    }, commentsPollMs)

    return () => clearInterval(interval)
  }, [analyzePostComments, liveCommentsEnabled, commentsPollMs])

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
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
              onClick={trainModelFromApi}
              disabled={modelTraining}
            >
              {modelTraining ? 'Training...' : 'Train Model (Live Stream)'}
            </button>
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
        {modelTrainStatus && (
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-cyan-100">{modelTrainStatus}</div>
        )}

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

        <div className="glass-card rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Post Comments Sentiment + Semantic Analysis</h2>
            <div className="flex items-center gap-2">
              <button
                className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                  liveCommentsEnabled
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                }`}
                onClick={() => setLiveCommentsEnabled((prev) => !prev)}
              >
                {liveCommentsEnabled ? 'Live ON' : 'Live OFF'}
              </button>
              <button
                className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
                onClick={() => analyzePostComments()}
                disabled={commentsLoading}
              >
                {commentsLoading ? 'Analyzing...' : 'Analyze Now'}
              </button>
            </div>
          </div>

          <p className="mb-3 text-xs text-slate-400">
            {liveCommentsEnabled ? `Live refresh every ${Math.round(commentsPollMs / 1000)}s` : 'Live refresh paused'}
            {commentsLastUpdated ? ` • Updated: ${commentsLastUpdated}` : ''}
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">X Post/Search URL</label>
            <input
              type="text"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://x.com/<user>/status/<id>"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Manual Max Comments</label>
              <input
                type="number"
                min={1}
                max={100}
                value={commentsMaxResults}
                onChange={(e) => {
                  const nextValue = Number(e.target.value)
                  if (Number.isNaN(nextValue)) return
                  setCommentsMaxResults(Math.max(1, Math.min(nextValue, 100)))
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Manual API Command (PowerShell)</p>
              <p className="text-xs text-slate-300 break-all">
                {manualApiCommand}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-cyan-100">
            <p>
              API Source: {commentInsights.meta.source} | Model: {commentInsights.meta.modelEngine.toUpperCase()} | Requested: {commentInsights.meta.requestedMaxResults} | Returned: {commentInsights.meta.returnedCount} | Live: {commentInsights.meta.live ? 'yes' : 'no'}
              {commentInsights.meta.stale ? ' | Cache: stale' : ''}
            </p>
            {commentInsights.meta.warning && <p className="mt-1 text-amber-300">Warning: {commentInsights.meta.warning}</p>}
          </div>

          {commentsError && <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">{commentsError}</div>}

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wider text-red-200">Critical</p>
              <p className="text-2xl font-bold text-red-300">{commentInsights.summary.critical || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-600/40 bg-slate-700/20 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-300">Neutral</p>
              <p className="text-2xl font-bold text-slate-200">{commentInsights.summary.neutral || 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wider text-emerald-200">Positive</p>
              <p className="text-2xl font-bold text-emerald-300">{commentInsights.summary.positive || 0}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
              <p className="text-[11px] uppercase tracking-wider text-cyan-200">Total</p>
              <p className="text-2xl font-bold text-cyan-300">{commentInsights.summary.total || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300">Top Semantic Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {(commentInsights.semantic.top_keywords || []).slice(0, 12).map((item, idx) => (
                  <span key={`${item.term || idx}`} className="rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200">
                    {item.term} ({item.count})
                  </span>
                ))}
                {(!commentInsights.semantic.top_keywords || !commentInsights.semantic.top_keywords.length) && (
                  <span className="text-xs text-slate-500">No keywords yet</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300">Semantic Themes</h3>
              <div className="flex flex-wrap gap-2">
                {(commentInsights.semantic.themes || []).map((theme, idx) => (
                  <span key={`${theme.theme || idx}`} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                    {theme.theme}: {theme.hits}
                  </span>
                ))}
                {(!commentInsights.semantic.themes || !commentInsights.semantic.themes.length) && (
                  <span className="text-xs text-slate-500">No themes yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 max-h-[300px] space-y-2 overflow-auto pr-1">
            {(commentInsights.comments || []).map((comment, idx) => (
              <div key={`${comment.external_id || idx}`} className="rounded-lg border border-slate-700/40 bg-slate-900/20 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{comment.author || 'user'}</span>
                  <span className={
                    comment.sentiment_ui === 'critical'
                      ? 'text-red-300'
                      : comment.sentiment_ui === 'positive'
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                  }>
                    {comment.sentiment_ui || 'neutral'} ({Math.round((comment.confidence || 0) * 100)}%)
                  </span>
                </div>
                <p className="text-slate-200">{comment.content}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(comment.semantic_tags || []).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
            {(!commentInsights.comments || !commentInsights.comments.length) && (
              <p className="text-xs text-slate-500">Run analysis to see extracted comments and sentiment labels.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
