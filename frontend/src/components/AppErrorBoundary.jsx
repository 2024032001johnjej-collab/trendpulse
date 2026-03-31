import { Component } from 'react'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown runtime error' }
  }

  componentDidCatch(error, info) {
    // Keep this log for local debugging in browser devtools.
    console.error('App runtime error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/40 bg-red-900/20 p-6">
            <h1 className="mb-2 text-2xl font-bold text-red-300">UI runtime error</h1>
            <p className="text-sm text-red-100/90">The dashboard crashed while rendering. Refresh the page after fixing the error.</p>
            <pre className="mt-4 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-red-200">{this.state.message}</pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
