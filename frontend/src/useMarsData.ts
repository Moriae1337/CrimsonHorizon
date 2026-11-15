import { useEffect, useState } from 'react'
import { fetchLandmarks, fetchMapCatalog } from './api'
import {
  DEFAULT_LANDMARKS,
  DEFAULT_MAP_CATALOG,
  type MapCatalog,
  type MarsLandmarksGeoJson,
} from './marsCatalog'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
const DATA_TIMEOUT_MS = 60_000

export function useMarsData() {
  const [catalog, setCatalog] = useState<MapCatalog>(DEFAULT_MAP_CATALOG)
  const [landmarks, setLandmarks] = useState<MarsLandmarksGeoJson>(DEFAULT_LANDMARKS)

  useEffect(() => {
    if (!API_URL) return

    const controller = new AbortController()
    let unmounted = false
    const timeoutId = setTimeout(() => controller.abort(), DATA_TIMEOUT_MS)

    const load = async () => {
      try {
        const [remoteCatalog, remoteLandmarks] = await Promise.all([
          fetchMapCatalog(API_URL, controller.signal),
          fetchLandmarks(API_URL, controller.signal),
        ])
        if (unmounted) return
        setCatalog(remoteCatalog)
        setLandmarks(remoteLandmarks)
      } catch {
        // Keep built-in NASA/USGS fallback catalog if the backend is unavailable.
      } finally {
        clearTimeout(timeoutId)
      }
    }

    void load()

    return () => {
      unmounted = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return { catalog, landmarks }
}
