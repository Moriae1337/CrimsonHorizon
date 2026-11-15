export async function checkHealth(apiUrl: string, signal: AbortSignal): Promise<void> {
  const response = await fetch(`${apiUrl}/health`, { signal })
  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}.`)
  }
  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null || !('status' in data) || data.status !== 'ok') {
    throw new Error('Health check returned an unexpected response.')
  }
}
