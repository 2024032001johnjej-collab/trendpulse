import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div className="bg-dot-grid min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,_#1f1b4d_0%,_#0f172a_45%,_#020617_100%)] text-slate-200">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-900/60 shadow-xl">
            <img src="/logo-dark.png" alt="TrendPulse" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="mb-3 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
            TrendPulse OS
          </h1>
          <p className="text-lg text-slate-400">Select your intelligence access protocol</p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          <Link
            to="/login"
            className="glass-card rounded-3xl border-blue-500/20 p-9 transition duration-300 hover:-translate-y-1 hover:border-blue-400/50"
          >
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-300">User Node</div>
            <h2 className="mb-2 text-3xl font-bold text-white">User Access</h2>
            <p className="mb-6 text-slate-400">Login and monitor trend feeds, sentiment velocity, and crisis score.</p>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-300">
              Initialize User Session →
            </div>
          </Link>

          <Link
            to="/admin-login"
            className="glass-card rounded-3xl border-rose-500/20 p-9 transition duration-300 hover:-translate-y-1 hover:border-rose-400/50"
          >
            <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-rose-300">Admin Core</div>
            <h2 className="mb-2 text-3xl font-bold text-white">Admin Access</h2>
            <p className="mb-6 text-slate-400">Operational controls, system health, and security audit visibility.</p>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300">
              Engage Admin Override →
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
