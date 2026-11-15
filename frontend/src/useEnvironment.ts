import { useEffect, useState } from 'react'
import { fetchEnvironment, type EnvironmentContext } from './environment'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
// Allow time for the backend to wake up on Render Free.
const ENVIRONMENT_TIMEOUT_MS = 60_000

export type EnvironmentStatus = 'loading' | 'ready' | 'unavailable'

export interface EnvironmentState {
  status: EnvironmentStatus
  environment: EnvironmentContext | null
}

/** Loads the optional archival weather/radiation context; a failure only hides the cards. */
export function useEnvironment(scenarioId: string): EnvironmentState {
  const [state, setState] = useState<EnvironmentState>(
    API_URL
      ? { status: 'loading', environment: null }
      : { status: 'unavailable', environment: null },
  )

  useEffect(() => {
    const apiUrl = API_URL
    if (!apiUrl) return
    const controller = new AbortController()
    let active = true
    const timeoutId = setTimeout(() => controller.abort(), ENVIRONMENT_TIMEOUT_MS)

    fetchEnvironment(apiUrl, scenarioId, controller.signal)
      .then((environment) => {
        if (active) setState({ status: 'ready', environment })
      })
      .catch(() => {
        if (active) setState({ status: 'unavailable', environment: null })
      })
      .finally(() => clearTimeout(timeoutId))

    return () => {
      active = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [scenarioId])

  return state
}
