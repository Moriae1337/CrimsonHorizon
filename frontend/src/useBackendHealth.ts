import { useEffect, useState } from 'react'
import { checkHealth } from './api'

export type BackendStatus = 'connecting' | 'connected' | 'disconnected'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
// Allow time for the backend to wake up on Render Free.
const HEALTH_TIMEOUT_MS = 60_000

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>(API_URL ? 'connecting' : 'disconnected')
  const [error, setError] = useState<string | null>(API_URL ? null : 'VITE_API_URL is not set.')

  useEffect(() => {
    const apiUrl = API_URL
    if (!apiUrl) return

    const controller = new AbortController()
    let unmounted = false
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)

    const connect = async () => {
      try {
        await checkHealth(apiUrl, controller.signal)
        if (unmounted) return
        setStatus('connected')
        setError(null)
      } catch (err) {
        if (unmounted) return
        setStatus('disconnected')
        if (controller.signal.aborted) {
          setError('The backend did not respond in time.')
        } else if (err instanceof TypeError) {
          setError('Could not reach the backend (network error).')
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error.')
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    void connect()

    return () => {
      unmounted = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return { status, error }
}
