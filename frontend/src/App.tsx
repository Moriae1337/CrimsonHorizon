import { useBackendHealth } from './useBackendHealth'
import type { BackendStatus } from './useBackendHealth'

const STATUS_STYLES: Record<BackendStatus, { label: string; dot: string; text: string }> = {
  connecting: { label: 'Connecting', dot: 'bg-amber-400', text: 'text-amber-300' },
  connected: { label: 'Connected', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  disconnected: { label: 'Disconnected', dot: 'bg-red-500', text: 'text-red-400' },
}

function App() {
  const { status, error } = useBackendHealth()
  const style = STATUS_STYLES[status]

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-950 via-slate-900 to-orange-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight text-orange-500 sm:text-5xl">
          CrimsonHorizon
        </h1>
        <p className="mt-2 text-sm uppercase tracking-widest text-slate-400">
          NASA Space Apps Challenge 2026
        </p>

        <p className="mt-8 text-2xl font-medium">Hello, Mars!</p>

        <div
          className="mt-8 flex items-center justify-center gap-2 text-sm"
          role="status"
          aria-live="polite"
        >
          <span className="text-slate-400">Backend Status:</span>
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden="true" />
          <span className={`font-semibold ${style.text}`}>{style.label}</span>
        </div>
        {error && <p className="mt-2 text-xs text-slate-500">{error}</p>}
      </div>
    </main>
  )
}

export default App
