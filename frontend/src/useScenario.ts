import { useCallback, useEffect, useState } from 'react'
import { fetchScenario } from './api.ts'
import { describeScenarioFailure, type Scenario, type ScenarioStatus } from './scenario.ts'

const API_URL = import.meta.env?.VITE_API_URL?.trim().replace(/\/+$/, '')
// Allow time for the backend to wake up on Render Free.
const SCENARIO_TIMEOUT_MS = 60_000

export interface ScenarioState {
  status: ScenarioStatus
  scenario: Scenario | null
  error: string | null
}

const LOADING: ScenarioState = { status: 'loading', scenario: null, error: null }

/**
 * Loads one scenario independently of the base map catalog. A failure never touches the
 * Mars layers; `retry` starts a fresh request and a success restores the scenario view.
 */
export function useScenario(scenarioId: string, customApiUrl?: string) {
  const apiUrl = customApiUrl ?? API_URL
  const [state, setState] = useState<ScenarioState>(
    apiUrl ? LOADING : { status: 'unavailable', scenario: null, error: 'VITE_API_URL is not set.' },
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!apiUrl) return

    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, SCENARIO_TIMEOUT_MS)

    const load = async () => {
      try {
        const scenario = await fetchScenario(apiUrl, scenarioId, controller.signal)
        if (!active) return
        setState({ status: 'ready', scenario, error: null })
      } catch (err) {
        // A superseded or unmounted request must not overwrite newer state.
        if (!active) return
        const { status, message } = describeScenarioFailure(err, timedOut)
        setState({ status, scenario: null, error: message })
      } finally {
        clearTimeout(timeoutId)
      }
    }

    void load()

    return () => {
      active = false
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [scenarioId, attempt, apiUrl])

  const retry = useCallback(() => {
    if (!apiUrl) return
    setState(LOADING)
    setAttempt((n) => n + 1)
  }, [apiUrl])

  return { ...state, retry, canRetry: Boolean(apiUrl) }
}
